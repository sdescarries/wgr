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
  const template = await Bun.file('./template.html').text() as string;
  let output = template.replaceAll(`%gymid%`, gymid);
  for (const [key, value] of Object.entries(keys)) {
    output = output.replaceAll(`%${key}%`, value);
  }
  return output;
};

const importantHeaders = [
  'Cache-Control',
  'Content-Disposition',
  'Content-Length',
  'Content-Type',
  'Last-Modified',
  'ETag',
] as const;

async function fwdResponse(proxy: Response, ctx: Koa.Context) {
  importantHeaders.forEach(header => {
    const value = proxy.headers.get(header);
    if (value) {
      ctx.set(header, value);
    }
  })
  ctx.status = proxy.status;

  if (proxy.body == null) {
    return;
  }
  const arrBuf = await Bun.readableStreamToArrayBuffer(proxy.body);
  ctx.body = Buffer.from(arrBuf);
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
    const proxy: Response = await fetch(
      `${urlOrigin}${ctx.path}`,
      {
        redirect: 'manual',
        credentials: 'include',
        headers: {
          'Accept': ctx.get('Accept'),
          'Accept-Encoding': ctx.get('Accept-Encoding'),
          'Cookie': `${sessionCookie}=${session};`,
          'Origin': urlOrigin,
          'Referer': urlGuestReg,
          'User-Agent': ctx.get('User-Agent'),
        },
        verbose: true,
      });

    await fwdResponse(proxy, ctx);
    return next();
  }

  const root = await fetch(urlGuestReg, {
    headers: {
      'Accept-Encoding': 'identity',
      'User-Agent': ctx.get('User-Agent'),
    },
    verbose: true,
  })
    .then(response => response.text())
    .then(parse);

  const VIEWSTATE = root.getElementById("__VIEWSTATE")?.getAttribute('value');
  const VIEWSTATEGENERATOR = root.getElementById("__VIEWSTATEGENERATOR")?.getAttribute('value');
  const EVENTVALIDATION = root.getElementById("__EVENTVALIDATION")?.getAttribute('value');

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
  const bodyStr = JSON.stringify(body, null, 2);
  Bun.write(debugFile + '.json', bodyStr).catch(error =>
    console.write(`Failed saving debug info: ${error.message}\n\n${bodyStr}\n\n`));

  const proxy: Response = await fetch(
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
    });

  const cookies = setCookie(proxy.headers.get('Set-Cookie') ?? '', { map: true });
  const session = cookies[sessionCookie]?.value;
  if (!session) {
    return fwdResponse(proxy, ctx);
  }

  console.write(`New session: ${session}\n`);
  ctx.cookies.set(sessionCookie, session);
  return ctx.redirect('/GuestRegConfirm.aspx?gymid=10');
}

async function debug(ctx: Koa.Context, next: Koa.Next): Promise<void> {

  if (ctx.path === '/redirect') {
    console.write(`/redirect\n`);
    const proxy: Response = await fetch(
      `http://localhost:3000/challenge`,
      {
        credentials: 'include',
        redirect: 'manual',
        verbose: true,
      });
    const cookies = setCookie(proxy.headers.get('Set-Cookie') ?? '', { map: true });
    Object.entries(cookies).forEach(([name, value]) => console.write(`${name}: ${value}\n`));

    ctx.cookies.set('foo', cookies['foo'].value);
    ctx.response.type = "html";
    const location = proxy.headers.get('location');
    if (proxy.status === 302 && location) {
      ctx.redirect(location);
    }
    console.write(`/redirect: OK\n`);
    return;
  }

  if (ctx.path === '/challenge') {
    ctx.cookies.set('foo', new Date().toLocaleDateString());
    ctx.redirect('/redirected');
    console.write(`/challenge: OK\n`);
    return;
  }

  if (ctx.path === '/redirected') {
    const session = ctx.cookies.get('foo');

    console.write(`/redirected: ${session}\n`);
    const proxy: Response = await fetch(
      `http://localhost:3000/loopy`,
      {
        credentials: 'include',
        redirect: 'manual',
        verbose: true,
        headers: {
          'Accept-Encoding': 'identity',
          'Cookie': `foo=${session};`,
        },
      });

    await fwdResponse(proxy, ctx);
    console.write(`/redirected: OK\n`);
    return;
  }

  if (ctx.path === "/loopy") {
    const session = ctx.cookies.get('foo');
    console.write(`/loopy: ${session}\n`);

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
