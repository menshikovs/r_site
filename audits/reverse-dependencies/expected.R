root <- 'audits/reverse-dependencies/2026-10-29/full'
metadata <- readRDS(file.path(root,'packages.rds'))
fields <- c('Reverse depends','Reverse imports','Reverse linking to','Reverse suggests','Reverse enhances')
stopifnot(all(fields %in% colnames(metadata)))
metadata <- metadata[is.na(metadata[,'Path']) | !nzchar(metadata[,'Path']),,drop=FALSE]
result <- data.frame(Package=metadata[,'Package'],stringsAsFactors=FALSE,check.names=FALSE)
for(field in fields) result[[field]] <- vapply(metadata[,field],function(value){
  if(is.na(value)||!nzchar(trimws(value)))return('')
  paste(trimws(strsplit(value,',',fixed=TRUE)[[1L]]),collapse=' ')
},character(1))
write.table(result,file.path(root,'expected.tsv'),quote=FALSE,row.names=FALSE,sep='\t')
cat('Independent source expectations:',nrow(result),'packages\n')
