import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {
    colors: {
      primary: {
        DEFAULT: "#FFA500",
        dark: "#FFA500",
        light: "#FDECEC",
      },
      appbg: "#F5F5F5",
    },
  },},
  plugins: [],
};
export default config;
