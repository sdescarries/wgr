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

function fwdResponse(proxy: Response, ctx: Koa.Context) {
  importantHeaders.forEach(header => {
    const value = proxy.headers.get(header);
    if (value) {
      ctx.set(header, value);
    }
  })
  ctx.status = proxy.status;
  ctx.body = proxy.body;
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
    const proxy = await fetch(
      `${urlOrigin}${ctx.path}`,
      {
        redirect: 'manual',
        credentials: 'include',
        headers: {
          'Accept-Encoding': 'identity',
          'Cookie': `${sessionCookie}=${session};`,
          'Origin': urlOrigin,
          'Referer': urlGuestReg,
          'User-Agent': ctx.get('User-Agent'),
        }
      }).catch(error => error.response);

    fwdResponse(proxy, ctx);
    return next();
  }

  const root = await fetch(urlGuestReg, {
    headers: {
      'Accept-Encoding': 'identity',
      'User-Agent': ctx.get('User-Agent'),
    }
  })
    .then(response => response.text())
    .then(parse);

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

  const proxy = await fetch(
    urlGuestReg,
    {
      verbose: true,
      method: 'POST',
      body,
      headers: {
        'Accept-Encoding': 'identity',
        'Origin': urlOrigin,
        'Referer': urlGuestReg,
        'User-Agent': ctx.get('User-Agent'),
      },
      redirect: 'manual',
      credentials: 'include',
    }).catch(error => error.response);

  const cookies = setCookie(proxy, { map: true });
  const session = cookies[sessionCookie]?.value;
  if (!session) {
    return fwdResponse(proxy, ctx);
  }

  console.write(`New session: ${session}`);
  ctx.cookies.set(sessionCookie, session);
  return ctx.redirect('/GuestRegConfirm.aspx?gymid=10');
}

async function debug(ctx: Koa.Context, next: Koa.Next): Promise<void> {

  if (ctx.path === '/redirect') {
    console.write(`/redirect`);
    const proxy: Response = await fetch(
      `http://localhost:3000/challenge`,
      {
        redirect: 'manual',
        credentials: 'include',
      }).catch(error => error.response);
    const cookies = setCookie(proxy.headers.getAll('Set-Cookie'), { map: true });
    Object.entries(cookies).forEach(([name, value]) => console.write(`${name}: ${value}`));

    ctx.cookies.set('foo', cookies['foo'].value);
    ctx.response.type = "html";
    const location = proxy.headers.get('location');
    if (proxy.status === 302 && location) {
      ctx.redirect(location);
    }
    console.write(`/redirect: OK`);
    return;
  }

  if (ctx.path === '/challenge') {
    ctx.cookies.set('foo', new Date().toLocaleDateString());
    ctx.redirect('/redirected');
    console.write(`/challenge: OK`);
    return;
  }

  if (ctx.path === '/redirected') {
    const session = ctx.cookies.get('foo');

    console.write(`/redirected: ${session}`);
    const proxy = await fetch(
      `http://localhost:3000/loopy`,
      {
        redirect: 'manual',
        credentials: 'include',
        headers: {
          'Accept-Encoding': 'identity',
          'Cookie': `foo=${session};`,
        }
      }).catch(error => error.response);

    fwdResponse(proxy, ctx);
    console.write(`/redirected: OK`);
    return;
  }

  if (ctx.path === "/loopy") {
    const session = ctx.cookies.get('foo');
    console.write(`/loopy: ${session}`);

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

app.listen(3000, () => console.write(`\nListening: http://localhost:${3000}/\n\n`));
