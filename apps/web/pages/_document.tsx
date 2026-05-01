import { Html, Head, Main, NextScript } from "next/document";

// This file sets up the Pages Router document used by Next.js when generating
// static error pages (/404, /500) even in App Router mode.
export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
