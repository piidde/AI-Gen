import type { CatalogueReference } from '../content/catalogue';
import { publishedReference, publishedDifference, bestImageSettings, sellingPrice, openaiImageUsd } from '../content/publishedPrices';
import { decimalAmount, formatAmount } from '../lib/pricing';
import '../styles/model-prices.css';

export default function ModelPrices({ model, compact = false, overview = false }: { model: CatalogueReference; compact?: boolean; overview?: boolean }) {
  const settings = bestImageSettings(model);
  const autoQuality = ['gpt-image-2.5', 'gpt-image-2'].includes(model.upstreamId);
  const simpleImage = model.upstreamId === 'gpt-image-2.5';
  const officialRange = simpleImage ? ['low', 'high'].map(quality => formatAmount(decimalAmount(openaiImageUsd(model.upstreamId, '1K', quality)), 3).decimal).join('–$') : null;
  return <div className="landing-prices">
    {model.rates.filter(rate => rate.component !== 'cached-input').map(rate => {
      const reference = publishedReference(model, rate, settings);
      const amount = rate.credits === null ? null : sellingPrice(rate.credits);
      const price = amount && formatAmount(amount, amount.numerator > 0n && amount.numerator * 100n < amount.denominator ? 3 : 2);
      const official = reference.status === 'available' ? formatAmount(decimalAmount(reference.usd), Number(reference.usd) < 0.01 ? 3 : 2) : null;
      const difference = reference.status === 'available' && rate.credits !== null ? publishedDifference(rate.credits, reference.usd) : null;
      const highComparison = simpleImage && rate.credits !== null ? publishedDifference(rate.credits, openaiImageUsd(model.upstreamId, '1K', 'high')) : null;
      const image = model.modality === 'image';
      const savingsBadge = simpleImage && highComparison?.direction === 'lower'
        ? <span className="landing-saving">Save up to {highComparison.percent}%</span>
        : !simpleImage && difference?.direction === 'lower'
          ? <span className="landing-saving">{autoQuality ? `${difference.percent}% below Low reference` : `Save up to ${difference.percent}%`}</span> : null;
      if (compact) {
        const comparison = simpleImage ? formatAmount(decimalAmount(openaiImageUsd(model.upstreamId, '1K', 'high')), 3) : official;
        const saving = simpleImage ? highComparison : difference;
        return <section className="landing-rate" key={rate.component} aria-label={`${image ? 'Image generation' : rate.component === 'input' ? 'Input' : 'Output'} price comparison`}>
          {!image && <span className="landing-rate-label">{rate.component === 'input' ? 'Input' : 'Output'}</span>}
          <div className="landing-our-price"><span className="landing-price-label">Our price</span><div className="landing-price"><strong>{price ? <>{price.approximate && <span className="price-approx">≈ </span>}${price.decimal}</> : 'Not listed'}</strong><span>{image ? '/ request' : '/ 1M tokens'}</span></div></div>
          {comparison && <div className="landing-official"><span className="sr-only">Official API reference: </span>{comparison.approximate && <span className="price-approx">≈ </span>}<s className="official-amount discounted">${comparison.decimal}</s><span className="landing-unit">{image ? '/ image output' : '/ 1M tokens'}</span></div>}
          {saving?.direction === 'lower' && <span className="landing-saving">Save up to {saving.percent}%</span>}
          <div className="price-reference-basis"><p>{simpleImage ? '1K · Auto quality; official High reference' : image ? `${settings.resolution} image output` : reference.status === 'available' ? reference.basis.replace(/; input$|; output$/, '') : ''}</p></div>
        </section>;
      }
      return <section className="landing-rate" key={rate.component} aria-label={`${rate.component === 'input' ? 'Input' : rate.component === 'output' ? 'Output' : 'Image generation'} price comparison`}>
        {(!overview || !image) && <div className="landing-rate-label"><span>{rate.component === 'input' ? 'Input' : rate.component === 'output' ? 'Output' : 'Image generation'}</span>{overview && savingsBadge}</div>}
        <div className="landing-our-price"><div className={overview ? 'overview-price-heading' : undefined}><span className="landing-price-label">Our price</span>{overview && image && savingsBadge}</div>
          <div className="landing-price"><strong>{price ? <>{price.approximate && <span className="price-approx">≈ </span>}${price.decimal}</> : 'Not listed'}</strong><span>{image ? '/ request' : '/ 1M tokens'}</span></div>
        </div>
        <div className="landing-official"><span className="landing-price-label">Official API{image ? ' example' : ''}</span>
          {officialRange ? <><span className="price-approx">≈ </span><span className="official-amount">${officialRange}</span><span className="landing-unit">/ image output</span></> : official ? <>{official.approximate && <span className="price-approx">≈ </span>}<span className={difference?.direction === 'lower' ? 'official-amount discounted' : 'official-amount'}>${official.decimal}</span><span className="landing-unit">{image ? '/ image output' : '/ 1M tokens'}</span></> : <p>{reference.status === 'unavailable' && reference.reason}</p>}
        </div>
        {!overview && savingsBadge}
        {overview && reference.status === 'available' && <div className="price-reference-basis"><p>{simpleImage ? 'Auto quality · official 1K High savings reference' : image ? `${settings.resolution} · ${model.provider === 'OpenAI' ? `${settings.quality.charAt(0).toUpperCase() + settings.quality.slice(1)} quality · ` : ''}official image output` : reference.basis.replace(/; input$|; output$/, '')}</p></div>}
        {!overview && reference.status === 'available' && <div className="price-reference-basis"><p>{simpleImage ? '1K images · Automatic quality' : reference.basis}</p>
          {simpleImage ? <p>Savings vs official 1K High pricing; our quality is automatic. Range: Low–High output. Input extra.</p> : image && <p>{autoQuality ? 'Auto output varies; Low benchmark only. ' : ''}Output example; input{model.provider === 'Google' ? ' and thinking' : ''} extra. Served settings unverified.</p>}
          <a className="text-link" href={reference.source}>Official pricing ↗</a>
        </div>}
      </section>;
    })}
  </div>;
}
