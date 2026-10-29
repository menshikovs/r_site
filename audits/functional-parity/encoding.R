x <- matrix(c('example','1.0','I\u00f1aki, Gin\u00e9-V\u00e1zquez, \u017dlu\u0165ou\u010dk\u00fd'),nrow=1,dimnames=list(NULL,c('Package','Version','Author')))
root <- 'audits/functional-parity/2026-10-29'
write.dcf(x,file=file.path(root,'encoding-default.dcf'))
connection <- file(file.path(root,'encoding-utf8.dcf'),open='wt',encoding='UTF-8')
write.dcf(x,file=connection)
close(connection)
