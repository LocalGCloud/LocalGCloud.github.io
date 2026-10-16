// Neutral paper: the same syntax palette for docs and service examples.
export const neutralPaperTheme = {
  name: 'neutral-paper',
  type: 'light',
  colors: { 'editor.background': '#F1F3F4', 'editor.foreground': '#37474F' },
  tokenColors: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#5E6B61' } },
    { scope: ['keyword', 'storage'], settings: { foreground: '#315F9C' } },
    { scope: ['string'], settings: { foreground: '#A13F35' } },
    { scope: ['entity.name.function', 'support.function'], settings: { foreground: '#6B4E86' } },
    { scope: ['variable', 'meta.definition.variable'], settings: { foreground: '#375B70' } },
    { scope: ['entity.name.type', 'support.type', 'support.class'], settings: { foreground: '#006A67' } },
    { scope: ['constant.numeric', 'constant.language'], settings: { foreground: '#7C4B2C' } },
    { scope: ['keyword.operator'], settings: { foreground: '#734A91' } },
  ],
};
