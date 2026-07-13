'use client';

export type CustomizableProperty = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[];
};

export type CustomizationValues = Record<string, string>;

type CustomizationFormProps = {
  fields?: CustomizableProperty[];
  values: CustomizationValues;
  onChange: (key: string, value: string) => void;
};

export function areRequiredCustomizationFieldsFilled(
  fields: CustomizableProperty[] | undefined,
  values: CustomizationValues
) {
  return (fields ?? []).every(field => {
    if (!field.required) return true;
    return Boolean(values[field.key]?.trim());
  });
}

export function buildCustomizationPayload(
  productName: string,
  productId: string,
  fields: CustomizableProperty[] | undefined,
  values: CustomizationValues
) {
  const customizationLines = (fields ?? [])
    .map(field => {
      const value = values[field.key]?.trim();
      return value ? `${field.label}: ${value}` : null;
    })
    .filter((line): line is string => Boolean(line));

  return [
    `Hi Mesh Bakery, I would like to order ${productName} (${productId}).`,
    customizationLines.length > 0 ? 'Customization details:' : null,
    ...customizationLines,
  ].filter(Boolean).join('\n');
}

export function CustomizationForm({ fields, values, onChange }: CustomizationFormProps) {
  if (!fields?.length) return null;

  return (
    <div className="mb-6 rounded-2xl border border-[#edd28a] bg-[#fff7dc] p-4 text-[#795622] shadow-[inset_0_1px_rgba(255,255,255,0.65)]">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-[10px] font-black uppercase tracking-widest">
          custom details
        </h3>
        <span className="text-[11px] opacity-65">
          required fields first
        </span>
      </div>

      <div className="space-y-3">
        {fields.map(field => {
          const inputType = field.type === 'number' ? 'number' : 'text';
          const isTextarea = field.type === 'textarea';
          const isSelect = field.type === 'select' && field.options?.length;
          const value = values[field.key] ?? '';

          return (
            <label key={field.key} className="block">
              <span className="mb-1.5 flex items-center justify-between gap-3 text-xs font-bold">
                <span>{field.label}</span>
                <span className="text-[10px] font-semibold uppercase tracking-widest opacity-55">
                  {field.required ? 'required' : 'optional'}
                </span>
              </span>

              {isSelect ? (
                <select
                  value={value}
                  onChange={event => onChange(field.key, event.target.value)}
                  className="w-full rounded-xl border border-[#e3c984] bg-white/62 px-3 py-2 text-sm text-[#2d2a26] outline-none transition-colors focus:border-[#ff6b35] focus:ring-1 focus:ring-[#ff6b35]"
                >
                  <option value="">{field.placeholder ?? 'Choose one'}</option>
                  {field.options?.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : isTextarea ? (
                <textarea
                  value={value}
                  onChange={event => onChange(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-[#e3c984] bg-white/62 px-3 py-2 text-sm text-[#2d2a26] placeholder-[#795622]/38 outline-none transition-colors focus:border-[#ff6b35] focus:ring-1 focus:ring-[#ff6b35]"
                />
              ) : (
                <input
                  type={inputType}
                  value={value}
                  onChange={event => onChange(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  className="w-full rounded-xl border border-[#e3c984] bg-white/62 px-3 py-2 text-sm text-[#2d2a26] placeholder-[#795622]/38 outline-none transition-colors focus:border-[#ff6b35] focus:ring-1 focus:ring-[#ff6b35]"
                />
              )}

              {field.helpText && (
                <span className="mt-1 block text-[11px] leading-snug opacity-62">
                  {field.helpText}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
