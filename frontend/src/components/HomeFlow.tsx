import Icon from './Icon';
import openaiIcon from '../assets/openai.svg';
import geminiIcon from '../assets/gemini.svg';
import '../styles/home-flow.css';

/** A product illustration, not a live request or an API contract. */
export default function HomeFlow() {
  return <section className="home-flow" aria-labelledby="home-flow-title">
    <header className="flow-heading">
      <div><div className="home-overline">Built around your workflow</div><h2 id="home-flow-title">Your app. Your models.<br /><span>Everything connected.</span></h2></div>
      <div className="flow-description"><p>Image and text, through Takewing. One place to manage your API keys, balance and every request.</p></div>
    </header>
    <div className="flow-workspace">
      <div className="flow-map-panel">
        <div className="flow-panel-header"><span><i /> REQUEST WORKSPACE</span><span>IMAGE + TEXT</span></div>
        <div className="flow-map" role="img" aria-label="Your application sends a request to Takewing and receives output from the image or text model you select.">
          <svg className="flow-connections" viewBox="0 0 800 300" preserveAspectRatio="none" aria-hidden="true">
            <path className="flow-rail" d="M220 150H400M400 150C490 150 490 75 580 75M400 150C490 150 490 225 580 225" />
            <path className="flow-signal flow-signal-image" pathLength="100" d="M220 150H400C490 150 490 75 580 75" />
            <path className="flow-signal flow-signal-text" pathLength="100" d="M220 150H400C490 150 490 225 580 225" />
          </svg>
          <div className="flow-app-card" aria-hidden="true">
            <div className="flow-window-bar"><span /><span /><span /><small>your-app</small></div>
            <div className="flow-app-body"><span className="flow-code-icon">{'{ }'}</span><strong>Your application</strong><span className="flow-card-note">An idea, ready to build.</span><div className="flow-code-lines"><i /><i /><i /></div><div className="flow-request-label"><Icon name="requests" /> API request <span>&rarr;</span></div></div>
          </div>
          <div className="flow-core" aria-hidden="true"><div className="flow-core-ring"><div className="flow-core-tile"><svg viewBox="0 0 32 38"><path d="M2 18 30 4v10L2 28Zm10 12 18-9v9l-18 8Z" fill="currentColor" /></svg></div></div><strong>Takewing</strong><span>One connection</span></div>
          <div className="flow-destinations" aria-hidden="true">
            <div className="flow-model-card flow-image-card"><div className="flow-model-heading"><Icon name="image" /><span>IMAGE GENERATION</span></div><div className="flow-provider"><img src={openaiIcon} alt="" /><strong>GPT Image 2.5</strong></div><div className="flow-provider"><img src={geminiIcon} alt="" /><span>Nano Banana Pro</span></div></div>
            <div className="flow-model-card flow-text-card"><div className="flow-model-heading"><Icon name="text" /><span>TEXT GENERATION</span></div><div className="flow-provider"><img src={openaiIcon} alt="" /><strong>GPT-6 Astra</strong></div><div className="flow-provider"><img src={geminiIcon} alt="" /><span>Gemini 3.8 Flash</span></div></div>
          </div>
        </div>
        <div className="flow-map-caption"><span />Your request. Your selected model.<span /></div>
      </div>
      <aside className="flow-balance">
        <div className="flow-balance-top"><span className="flow-wallet-icon"><Icon name="wallet" /></span><span>ONE SHARED BALANCE</span></div>
        <h3>Two ways to create.<br />One pool of credits.</h3>
        <div className="flow-credit-art" aria-hidden="true"><div className="flow-credit-sheet sheet-back" /><div className="flow-credit-sheet sheet-middle" /><div className="flow-credit-sheet sheet-front"><span>TAKEWING / CREDITS</span><div className="flow-credit-bars"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div><strong>Ready for your next idea.</strong></div></div>
        <div className="flow-balance-row"><span><Icon name="image" /> Image requests</span><Icon name="check" /></div>
        <div className="flow-balance-row"><span><Icon name="text" /> Text requests</span><Icon name="check" /></div>
        <p>Credits never expire.</p>
      </aside>
    </div>
    <ol className="flow-steps" aria-label="How Takewing works">
      <li><span>01</span><div><strong>Add credits</strong><p>Start with your budget.</p></div></li>
      <li><span>02</span><div><strong>Connect your app</strong><p>Your key. Your integration.</p></div></li>
      <li><span>03</span><div><strong>Make something great</strong><p>Send requests. Track every cost.</p></div></li>
    </ol>
  </section>;
}
