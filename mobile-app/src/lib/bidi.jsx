/* Package names come from the admin and often mix scripts: "غسيل متخصص (Deep Cleaning)".
   In an RTL paragraph a trailing ")" after Latin text flips to the wrong side, so every Latin
   run (including a wrapping pair of brackets) is isolated as its own LTR span. */

const LATIN_RUN = /(\([^()]*[A-Za-z][^()]*\)|[A-Za-z][A-Za-z0-9 .&'/+-]*[A-Za-z0-9])/g;

export function Mixed({ children }) {
  const text = String(children ?? '');
  if (!/[A-Za-z]/.test(text)) return text;
  const parts = text.split(LATIN_RUN);
  return parts.map((part, i) =>
    i % 2 === 1
      ? <span key={i} dir="ltr" style={{ unicodeBidi: 'isolate' }}>{part}</span>
      : part
  );
}
