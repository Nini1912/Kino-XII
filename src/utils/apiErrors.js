export function parseApiError(error) {
  const status = error.response?.status;
  const data = error.response?.data ?? {};

  if (
    status === 422 &&
    data.errors &&
    typeof data.errors === "object" &&
    !Array.isArray(data.errors)
  ) {
    const fieldErrors = Object.fromEntries(
      Object.entries(data.errors).map(([field, messages]) => [
        field,
        Array.isArray(messages) ? messages.join(" ") : String(messages),
      ]),
    );

    return {
      type: "validation",
      message: "",
      fieldErrors,
    };
  }

  return {
    type: status === 422 ? "rule" : "general",
    message:
      data.message ??
      error.message ??
      "Something went wrong. Please try again.",
    fieldErrors: {},
  };
}
