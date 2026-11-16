import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./errors";

/** Wraps a route handler so all errors become consistent JSON responses. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof AppError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
      }
      console.error(err);
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new AppError(400, "Request body must be valid JSON");
  }
}
