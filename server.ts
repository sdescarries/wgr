import axios, { AxiosResponse } from "axios";

import Koa from "koa";
import bodyParser from 'koa-body';
import { parse } from 'node-html-parser';
import setCookie from 'set-cookie-parser';

const app = new Koa();

app.use(bodyParser({
  multipart: true,
  urlencoded: true,
}));

const gymid = "10";
const urlOrigin = 'https://ggpx.info';
const urlGuestReg = `${urlOrigin}/GuestReg.aspx?gymid=${gymid}`;
const sessionCookie = 'ASP.NET_SessionId';

interface Keys {
  VIEWSTATE?: string;
  VIEWSTATEGENERATOR?: string;
  EVENTVALIDATION?: string;
}

async function body(keys: Keys): Promise<string> {
  const template = await Bun.file('./template.html').text();
  let output = template.replace(`%gymid%`, gymid);
  for (const [key, value] of Object.entries(keys)) {
    output = output.replace(`%${key}%`, value);
  }
  return output;
};

const importantHeaders = [
  'cache-control',
  'content-disposition',
  'content-encoding',
  'content-length',
  'content-type',
  'last-modified',
  'etag',
] as const;

function fwdResponse(proxy: AxiosResponse, ctx: Koa.Context) {
  importantHeaders.forEach(header => {
    const value = proxy.headers[header];
    if (value) {
      ctx.set(header, value);
    }
  })
  ctx.status = proxy.status;
  ctx.body = proxy.data;
}

async function load(ctx: Koa.Context, next: Koa.Next): Promise<void> {

  if (ctx.method !== "GET") {
    return next();
  }

  if (ctx.path === '/favicon.ico') {
    ctx.response.status = 204;
    return next();
  }

  if (ctx.path !== '/') {
    const session = ctx.cookies.get(sessionCookie);
    const proxy = await axios.get(
      `${urlOrigin}${ctx.path}`,
      {
        decompress: false,
        maxRedirects: 0,
        responseType: 'stream',
        withCredentials: true,
        headers: {
          'Accept-Encoding': 'deflate, gzip',
          'Cookie': `${sessionCookie}=${session};`,
          'Origin': urlOrigin,
          'Referer': urlGuestReg,
          'User-Agent': ctx.get('User-Agent'),
        }
      }).catch(error => error.response);

    fwdResponse(proxy, ctx);
    return next();
  }

  const { data } = await axios.get(urlGuestReg, {
    headers: {
      'Accept-Encoding': 'deflate, gzip',
      'User-Agent': ctx.get('User-Agent'),
    }
  });
  const root = parse(data);

  const VIEWSTATE = root.getElementById("__VIEWSTATE").getAttribute('value');
  const VIEWSTATEGENERATOR = root.getElementById("__VIEWSTATEGENERATOR").getAttribute('value');
  const EVENTVALIDATION = root.getElementById("__EVENTVALIDATION").getAttribute('value');

  ctx.response.type = "html";
  ctx.response.body = await body({
    VIEWSTATE,
    VIEWSTATEGENERATOR,
    EVENTVALIDATION,
  });
}

async function submit(ctx: Koa.Context, next: Koa.Next): Promise<void> {
  if (ctx.method !== "POST") {
    return next();
  }

  const { body } = ctx.request;
  const debugFile = `debug/submit-${new Date().toISOString()}`;
  await Bun.write(debugFile + '.json', JSON.stringify(body, null, 2));

  const proxy = await axios.postForm(
    urlGuestReg,
    body,
    {
      headers: {
        'Accept-Encoding': 'deflate, gzip',
        'Origin': urlOrigin,
        'Referer': urlGuestReg,
        'User-Agent': ctx.get('User-Agent'),
      },
      maxRedirects: 0,
      withCredentials: true,
    }).catch(error => error.response);

  const cookies = setCookie(proxy, { map: true });
  const session = cookies[sessionCookie]?.value;
  if (!session) {
    return fwdResponse(proxy, ctx);
  }

  console.log(`New session: ${session}`);
  ctx.cookies.set(sessionCookie, session);
  return ctx.redirect('/GuestRegConfirm.aspx?gymid=10');
}

async function debug(ctx: Koa.Context, next: Koa.Next): Promise<void> {

  if (ctx.path === '/redirect') {
    console.log(`/redirect`);
    const proxy: AxiosResponse = await axios.get(
      `http://localhost:3000/challenge`,
      {
        maxRedirects: 0,
        responseType: 'stream',
        withCredentials: true,
      }).catch(error => error.response);
    const cookies = setCookie(proxy, { map: true });
    console.log(cookies);

    ctx.cookies.set('foo', cookies['foo'].value);
    ctx.response.type = "html";
    if (proxy.status === 302) {
      ctx.redirect(proxy.headers['location']);
    }
    console.log(`/redirect: OK`);
    return;
  }

  if (ctx.path === '/challenge') {
    ctx.cookies.set('foo', new Date().toLocaleDateString());
    ctx.redirect('/redirected');
    console.log(`/challenge: OK`);
    return;
  }

  if (ctx.path === '/redirected') {
    const session = ctx.cookies.get('foo');

    console.log(`/redirected: ${session}`);
    const proxy = await axios.get(
      `http://localhost:3000/loopy`,
      {
        responseType: 'stream',
        maxRedirects: 0,
        withCredentials: true,
        headers: {
          'Accept-Encoding': 'deflate, gzip',
          'Cookie': `foo=${session};`,
        }
      }).catch(error => error.response);

    fwdResponse(proxy, ctx);
    console.log(`/redirected: OK`);
    return;
  }

  if (ctx.path === "/loopy") {
    const session = ctx.cookies.get('foo');
    console.log(`/loopy: ${session}`);

    ctx.response.type = "html";
    if (session) {
      ctx.body = session;
      ctx.status = 200;
    } else {
      ctx.status = 403;
    }
    return;
  }
  return next();
}

// response
app.use(load);
app.use(submit);
app.use(debug);

app.listen(3000);
