root <- 'audits/functional-parity/2026-10-29'
metadata <- readRDS(file.path(root,'packages.rds'))
if (!isTRUE(l10n_info()[['UTF-8']])) {
  for (candidate in c('.UTF-8','C.UTF-8','en_US.UTF-8')) {
    suppressWarnings(Sys.setlocale('LC_CTYPE',candidate))
    if (isTRUE(l10n_info()[['UTF-8']])) break
  }
}
stopifnot(isTRUE(l10n_info()[['UTF-8']]))
selected <- metadata[metadata[,'Package'] %in% c('ggplot2','data.table','Rcpp','termr','MASS') & (is.na(metadata[,'Path']) | !nzchar(metadata[,'Path'])),,drop=FALSE]
connection <- file(file.path(root,'representative-utf8.dcf'),open='wt',encoding='UTF-8')
write.dcf(selected,file=connection)
close(connection)
