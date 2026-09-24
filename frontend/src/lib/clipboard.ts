export async function copyText(text: string, clipboard: Pick<Clipboard, "writeText"> | undefined): Promise<{
  status: "success" | "error"; message: string;
}> {
  try {
    if (!clipboard) throw new Error("Clipboard unavailable");
    await clipboard.writeText(text);
    return { status: "success", message: "Copied." };
  } catch {
    return { status: "error", message: "Could not copy. Select and copy the text manually." };
  }
}
