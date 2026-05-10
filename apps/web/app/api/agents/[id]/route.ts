const apiUrl = process.env.API_URL ?? "http://127.0.0.1:4000";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const response = await fetch(`${apiUrl}/agents/${encodeURIComponent(id)}`);

  return new Response(await response.text(), {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json",
    },
  });
}
