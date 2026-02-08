import { Layout } from "@/components/Layout";
import { SiteForm } from "@/components/SiteForm";

export default function NewSitePage() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Nouveau site</h1>
          <p className="text-muted-foreground">
            Remplissez le formulaire pour créer un nouveau site vitrine
          </p>
        </div>
        <SiteForm />
      </div>
    </Layout>
  );
}
