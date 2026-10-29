// The archived full render predates explicit provenance attributes. Apply only
// the same rel="external" annotations now present in templates.mjs, then use
// the production portable writer. This is not a substitute for fresh generation.
export const annotateArchivedProvenance = html => html.replace(/<a href="(https:\/\/cran\.r-project\.org[^"]+)">(?=Official CRAN page|Documentation and downloads on CRAN)/g,'<a rel="external" href="$1">')
