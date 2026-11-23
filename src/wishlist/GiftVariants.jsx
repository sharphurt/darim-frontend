import { formatPrice, safeLink } from './giftPresentation.js'

export function VariantDetails({ variant, selected = false }) {
  const link = safeLink(variant.url)
  return <div className="gift-variant__details">
    <strong>{selected ? 'Выбранный вариант: ' : ''}{variant.title}</strong>
    <span>{formatPrice(variant.price) || 'Цена не указана'}</span>
    {link && <a href={link} target="_blank" rel="noreferrer" aria-label={`Где купить: ${variant.title}`}>Где купить</a>}
  </div>
}

export function GiftVariants({ gift, choose = false, pending = false }) {
  if (!gift.variants?.length) return null
  if (!choose) return <ul className="gift-variants" aria-label="Варианты подарка">
    {gift.variants.map(variant => <li key={variant.id}><VariantDetails variant={variant} /></li>)}
  </ul>
  return <fieldset className="gift-variants" disabled={pending}>
    <legend>Выберите вариант</legend>
    <input type="hidden" name="variantsVersion" value={gift.variantsVersion} />
    {gift.variants.map(variant => <div className="gift-variant__choice" key={variant.id}>
      <input type="radio" name="variantId" value={variant.id} required aria-label={variant.title} />
      <VariantDetails variant={variant} />
    </div>)}
  </fieldset>
}
