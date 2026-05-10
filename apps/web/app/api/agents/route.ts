const apiUrl = process.env.API_URL ?? "http://127.0.0.1:4000";

export async function POST(request: Request) {
  const response = await fetch(`${apiUrl}/agents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: await request.text(),
  });

  return new Response(await response.text(), {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json",
    },
  });
}
