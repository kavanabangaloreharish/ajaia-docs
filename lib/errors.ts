export class AppError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const notFound = (what = "Document") => new AppError(404, `${what} not found`);
export const forbidden = (msg = "You do not have permission to do that") => new AppError(403, msg);
export const badRequest = (msg: string) => new AppError(400, msg);
