/** @type {import("prettier").Config} */
const config = {
  plugins: ["prettier-plugin-tailwindcss"],

  printWidth: 100,
  tabWidth: 2,
  semi: true,
  singleQuote: false,
  trailingComma: "all",

  // Para o plugin do Tailwind entender helpers como cn/clsx
  tailwindFunctions: ["cn", "clsx"]
};

export default config;
