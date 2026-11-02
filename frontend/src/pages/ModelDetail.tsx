import { ProviderLogo } from "../components/ProviderLogo";
import { Link, useParams } from "react-router-dom";
import { activeModels, findFamilyPage } from "../content/modelFamilies";
import CatalogueBasis, { useCatalogueCurrency } from "../components/CatalogueBasis";
import ModelFamily from "../components/ModelFamily";
import PublicCatalogueShell from "../components/PublicCatalogueShell";
import Information from "./Information";
import "../styles/catalogue-overview.css";

export default function ModelDetail() {
  const { slug } = useParams();
  const page = findFamilyPage(slug);
  const currency = useCatalogueCurrency();
  if (!page) return <Information missing />;
  return <PublicCatalogueShell>
    <nav className="family-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link> / <Link to="/models">Models</Link> / <span aria-current="page">{page.family}</span></nav>
    <header className="family-intro"><span className="eyebrow">{page.modality === "image" ? "Image" : page.family.startsWith("GPT") ? "Coding" : "Chat"} model family</span><h1><ProviderLogo name={page.family} size={36} /> {page.family} API</h1><p>{page.explanation}</p><a className="text-link" href={page.source}>Official documentation</a></header>
    <CatalogueBasis />
    <ModelFamily family={page.family} variants={activeModels().filter(model => model.family === page.family)} currency={currency} linkPage={false} />
    <section className="family-integration"><h2>Before you integrate</h2><p>{page.limitation}</p><p>Call these models with your AIAPI.deals API key and the model ID from the list above. The quickstart shows the request format for {page.modality === "image" ? "image jobs" : "text models"}.</p><div className="actions"><Link className="button" to="/signup">Create an account</Link><Link className="text-link" to="/docs">Read the quickstart</Link><Link className="text-link" to="/models">Compare other models</Link></div></section>
  </PublicCatalogueShell>;
}
