const KEY = 'dac_converter_yaml';

export const writeConverterHandoff = (yaml: string) => {
  sessionStorage.setItem(KEY, yaml);
};

export const readConverterHandoff = (): string | null => {
  const v = sessionStorage.getItem(KEY);
  if (v) sessionStorage.removeItem(KEY);
  return v;
};