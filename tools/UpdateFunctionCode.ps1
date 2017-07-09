function UpdateFunctionCode(
    [Parameter(Mandatory=$True)][string]$stack,
    [Parameter(Mandatory=$True)][string]$function,
    [Parameter(Mandatory=$True)][string]$s3bucket
)
{
   $tempFile = [System.IO.Path]::GetTempFileName() + ".zip"
   $codeDirName = $function + "Function"
   $codePath = Join-Path "functions" $codeDirName
   $indexJsPath = Join-Path $codePath "index.js"
   $nodeModules = Join-Path $codePath "node_modules"
   if (-Not (Test-Path $indexJsPath)) {
      echo "Missing $indexJsPath"
      Return
   }
   Compress-Archive -Path $indexJsPath -DestinationPath $tempFile
   $nodeModulesExists = Test-Path $nodeModules
   if (Test-Path $nodeModules) {
      Compress-Archive -Path $nodeModules -DestinationPath $tempFile -Update
   }
   
   $s3key = "functions/" + $function + "/code.zip"
   $s3path = "s3://" + $s3bucket + "/" + $s3key
   aws s3 cp $tempFile $s3Path
   if (-Not ($?)) {
      echo "Error uploading to S3"
      Return
   }
   Remove-Item $tempFile
   echo "Uploaded to $s3Path"

   $stacksDescription = (aws cloudformation describe-stacks --stack-name $stack) | ConvertFrom-Json
   if (-Not ($stacksDescription)) {
      echo "Could not describe stack $stack"
      Return
   }
   $outputKey = $function + "FunctionName"
   $functionOutput = $stacksDescription.Stacks[0].Outputs | Where {$_.OutputKey -eq $outputKey}
   if (-Not ($functionOutput)) {
      echo "Could not find a function name for $outputKey in stack $stack"
      Return
   }
   $functionName = $functionOutput.OutputValue
   echo "Will update $functionName"
   
   aws lambda update-function-code --function-name $functionName --s3-bucket $s3bucket --s3-key $s3key
   
}