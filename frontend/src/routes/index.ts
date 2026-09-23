export const routes = [
  { path: "/", label: "运营总览" },
  { path: "/sessions", label: "组局拼车" },
] as const;

export type AppPath = (typeof routes)[number]["path"];
