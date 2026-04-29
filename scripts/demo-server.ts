declare const Bun: {
  file(input: URL): Blob & { exists(): Promise<boolean> };
  serve(options: { hostname: string; port: number; fetch(request: Request): Promise<Response> }): {
    hostname: string;
    port: number;
  };
};

const root = new URL("../demo/", import.meta.url);
const port = 4173;

const server = Bun.serve({
  hostname: "127.0.0.1",
  port,
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname === "/" ? "/index.html" : url.pathname;
    const file = Bun.file(new URL(`.${path}`, root));

    if (await file.exists()) {
      return new Response(file, {
        headers: {
          "content-type": path.endsWith(".html") ? "text/html; charset=utf-8" : "text/plain",
        },
      });
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Pareto demo fixture: http://${server.hostname}:${server.port}`);
