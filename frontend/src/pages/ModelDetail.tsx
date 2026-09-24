import { Link, useParams } from "react-router-dom";
import { activeModels, findFamilyPage } from "../content/modelFamilies";
import CatalogueBasis, { useCatalogueCurrency } from "../components/CatalogueBasis";
import ModelFamily from "../components/ModelFamily";
import PublicCatalogueShell from "../components/PublicCatalogueShell";
import Information from "./Information";

export default function ModelDetail() {
  const { slug } = useParams();
  const page = findFamilyPage(slug);
  const currency = useCatalogueCurrency();
  if (!page) return <Information missing />;
  return <PublicCatalogueShell>
    <nav className="family-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link> / <Link to="/models">Models</Link> / <span aria-current="page">{page.family}</span></nav>
    <header className="family-intro"><span className="eyebrow">{page.modality === "image" ? "Image" : "Text"} model family</span><h1>{page.family}</h1><p>{page.explanation}</p><a className="text-link" href={page.source}>Official family documentation</a><p className="review-note">Official capabilities describe the original provider. Takewing integration is not yet verified.</p></header>
    <CatalogueBasis />
    <ModelFamily family={page.family} variants={activeModels().filter(model => model.family === page.family)} currency={currency} linkPage={false} />
    <section className="family-integration"><h2>Before you integrate</h2><p>{page.limitation}</p><p>Takewing API IDs, base URL and request schemas are pending verification. No runnable request example is available yet. Generation will run through your own application using the Takewing API.</p><div className="actions"><Link className="button" to="/signup">Create an account</Link><Link className="text-link" to="/docs">Check documentation status</Link><Link className="text-link" to="/models">Compare other families</Link></div></section>
  </PublicCatalogueShell>;
}
