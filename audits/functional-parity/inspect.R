root <- 'audits/functional-parity/2026-10-29'
metadata <- readRDS(file.path(root, 'packages.rds'))
writeLines(c(paste('rows', nrow(metadata)), colnames(metadata)), file.path(root,'rds-columns.txt'))
selected <- metadata[metadata[, 'Package'] %in% c('ggplot2','data.table','Rcpp','termr','MASS'), , drop=FALSE]
write.dcf(selected, file=file.path(root,'representative-full.dcf'))
source('scripts/export-cran-data.R')
export_cran_data(file.path(root,'packages.rds'),file.path(root,'current-export.dcf'))
