export interface Env {
  DB: D1Database;
}

type ResponseBody = {
  date: string;
  currency: "MYR";
  open: number;
};

type PriceRow = {
  date: string;
  open: number;
};

async function fetch(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  const pathnameRegex = /^\/\d{4}-\d{2}-\d{2}$/;
  if (request.method !== "GET" || !url.pathname.match(pathnameRegex)) {
    return new Response("Not Found", { status: 404, statusText: "Not Found" });
  }

  const date = url.pathname.split("/")[1];
  const price = (await env.DB.prepare(`SELECT * FROM prices WHERE date = ?;`)
    .bind(date)
    .first()) as PriceRow | null;

  if (!price) {
    return new Response("Internal Server Error", {
      status: 500,
      statusText: "Internal Server Error",
    });
  }

  const resBody: ResponseBody = {
    date: price.date,
    currency: "MYR",
    open: price.open,
  };

  return new Response(JSON.stringify(resBody), {
    headers: {
      ["Content-Type"]: "application/json",
      ["Access-Control-Allow-Origin"]: "https://shopee.com.my",
    },
  });
}

export default { fetch };
