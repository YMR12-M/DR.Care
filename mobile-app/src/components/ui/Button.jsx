/* Road-sign button. primary = yellow plate with the inner border every sign has;
   secondary = outlined; ghost = text only; danger = red outline. Press inverts it. */
const VARIANT_CLASS = { primary: '', secondary: 'btn-sign--secondary', ghost: 'btn-sign--ghost', danger: 'btn-sign--danger' };

export default function Button({ variant = 'primary', size = 'lg', className = '', style, children, ...props }) {
  return (
    <button
      type="button"
      className={`btn-sign btn-sign--${size} ${VARIANT_CLASS[variant] ?? ''} ${className}`}
      style={style}
      {...props}
    >
      <span className="relative z-10 inline-flex items-center justify-center gap-2">{children}</span>
    </button>
  );
}
