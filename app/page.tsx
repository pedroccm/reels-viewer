import { getData } from "@/lib/data";
import Viewer from "@/components/Viewer";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { reels, curation, title } = await getData();
  const editable = Boolean(process.env.EDIT_PASSWORD);
  return <Viewer reels={reels} curation={curation} title={title} editable={editable} />;
}
