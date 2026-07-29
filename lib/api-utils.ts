export function ok<T>(data: T, status = 200) {
  return Response.json(data, { status });
}

export function bad(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export function notFound(message = "Not found") {
  return Response.json({ error: message }, { status: 404 });
}

export function serverError(err: unknown, message = "Internal server error") {
  console.error(err);
  return Response.json({ error: message }, { status: 500 });
}
