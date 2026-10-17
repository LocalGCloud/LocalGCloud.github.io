export default {
  name: 'local-agentation',
  hooks: {
    'astro:config:setup': ({ command, injectScript }) => {
      // Keep the entire entry out of build and preview, even when the flag is set.
      if (command === 'dev' && process.env.LOCAL_AGENTATION === '1') {
        injectScript('page', 'import "/src/scripts/agentation-dev.mjs";');
      }
    },
  },
};
