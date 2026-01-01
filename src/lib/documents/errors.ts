export class DocumentNotFoundError extends Error {
  constructor(message: string = "Document not found") {
    super(message);
    this.name = "DocumentNotFoundError";
  }
}
