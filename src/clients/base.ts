export class ServiceError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export async function serviceFetch(
  url: string,
  options: RequestInit = {},
): Promise<{ data: unknown; status: number }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  const res = await fetch(url, { ...options, headers });

  let data: unknown;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new ServiceError(res.status, `Service error: ${res.status} ${res.statusText}`, data);
  }

  return { data, status: res.status };
}
