export const isEmail = (value: string) => /.+@.+\..+/.test((value || '').trim());
export const isRequired = (value: string) => Boolean((value || '').trim());
