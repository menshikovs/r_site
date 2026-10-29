root <- 'audits/functional-parity/2026-10-29'
metadata <- readRDS(file.path(root,'packages.rds'))
current <- is.na(metadata[,'Path']) | !nzchar(metadata[,'Path'])
metadata <- metadata[current,,drop=FALSE]
fields <- c('Reverse depends','Reverse imports','Reverse linking to','Reverse suggests','Reverse enhances')
counts <- vapply(fields,function(field) vapply(metadata[,field],function(value) {
  if(is.na(value)||!nzchar(trimws(value))) return(0L)
  length(strsplit(value,',',fixed=TRUE)[[1L]])
},integer(1)),integer(nrow(metadata)))
result <- data.frame(Package=metadata[,'Package'],counts,check.names=FALSE)
write.csv(result,file.path(root,'reverse-cost.csv'),row.names=FALSE)
cat('current',nrow(metadata),'\n')
cat('with reverse',sum(rowSums(counts)>0),'edges',sum(counts),'\n')
known <- metadata[,'Package']
names_all <- unlist(lapply(fields,function(field)unlist(strsplit(paste(na.omit(metadata[,field]),collapse=','),',',fixed=TRUE))),use.names=FALSE)
names_all <- trimws(names_all)
names_all <- names_all[nzchar(names_all)]
link_bytes <- sum(nchar(paste0('<li><a href="/web/packages/',names_all,'/index.html">',names_all,'</a></li>'),type='bytes'))
stats <- c(current=nrow(metadata),with_reverse=sum(rowSums(counts)>0),edges=sum(counts),names_outside_current=sum(!names_all %in% known),distinct_outside_current=length(setdiff(unique(names_all),known)),illustrative_link_bytes=link_bytes,extra_page_bytes_estimate=link_bytes+sum(rowSums(counts)>0)*2500,missing_publication_with_fallback=sum(is.na(metadata[,'Date/Publication']) & !is.na(metadata[,'Published'])))
write.table(data.frame(metric=names(stats),value=as.numeric(stats)),file.path(root,'reverse-estimate.tsv'),row.names=FALSE,quote=FALSE,sep='\t')
writeLines(head(setdiff(unique(names_all),known),30),file.path(root,'reverse-external-examples.txt'))
cat('locale',Sys.getlocale('LC_CTYPE'),'\n')
cat('UTF8 attempt',Sys.setlocale('LC_CTYPE','.UTF-8'),'\n')
source('audits/functional-parity/encoding.R')
