const fs = require("fs");
const { optimize } = require("svgo");
const svelte = require("svelte/compiler");

function compileSvg(source, filename, ssr) {
  const {
    js: { code, map },
  } = svelte.compile(source, {
    generate: ssr ? "ssr" : "dom",
    dev: process.env.NODE_ENV === "development",
    hydratable: true,
    css: false,
  });
  return { code, map };
}

function optimizeSvg(content, path, config = {}) {
  const { data } = optimize(content, {
    ...(config || {}),
    path,
  });
  return data;
}

module.exports = (props = {}) => {
  let requireSuffix = true;
  if ('requireSuffix' in props) {
    requireSuffix = props.requireSuffix;
  }
  // Matches `*.svg`, `*.svg?component`, `*.svg?c`
  const svgRegex = /\.svg(?:\?(component))?(?:\?(c))?$/;
  const splitRegex = /(<svg.*?)(\/?>.*)/;

  return {
    name: "svelte-svg",
    transform(_, id, options) {
      const result = id.match(svgRegex);
      if (result && (result[1] === "component" || result[2] === "c" || !requireSuffix)) {
        const idWithoutQuery = id
          .replace(".svg?component", ".svg")
          .replace(".svg?c", ".svg");
        const code = fs.readFileSync(idWithoutQuery);
        let svg = optimizeSvg(code, idWithoutQuery, props?.svgoConfig);
        // Support any custom attributes
        const parts = splitRegex.exec(svg);
        if (parts === null) {
          console.error(
            "[vite-plugin-svelte-svg] Failed to parse:",
            idWithoutQuery
          );
        } else {
          const [_, head, body] = parts;
          let someProps = '';
          if (props?.props) {
           someProps += props?.props;
          }
          svg = `${head} ${someProps} {...{ ...$$restProps, class: ('${props?.class || ''}') + ' ' + ($$restProps.class || '')  }} ${body}`;
        }
        // Compile with Svelte
        return compileSvg(svg, idWithoutQuery, options?.ssr);
      }
      return null;
    },
  };
};
