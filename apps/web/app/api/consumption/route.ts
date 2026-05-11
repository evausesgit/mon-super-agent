const apiUrl = process.env.API_URL ?? "http://127.0.0.1:4000";

export async function GET() {
  const response = await fetch(`${apiUrl}/consumption`, {
    cache: "no-store",
  });

  return new Response(await response.text(), {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json",
    },
  });
}
