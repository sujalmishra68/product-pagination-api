function encodeCursor(data) {
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}

function decodeCursor(cursor) {
  try {
    return JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8")
    );
  } catch {
    return null;
  }
}

module.exports = { encodeCursor, decodeCursor };