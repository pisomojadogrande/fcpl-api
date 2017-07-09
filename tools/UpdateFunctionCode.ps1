function UpdateFunctionCode(
    [Parameter(Mandatory=$True)][string]$stack,
    [Parameter(Mandatory=$True)][string]$function,
    [Parameter(Mandatory=$True)][string]$s3bucket,
    [string] $codePath,
    [switch] $updateDeps
)
{
   if (-Not $codePath) {
     $codeDirName = $function + "Function"
     $codePath = Join-Path "functions" $codeDirName
   }
   $zipFile = Join-Path $codePath "code.zip"
   $indexJsPath = Join-Path $codePath "index.js"
   $nodeModules = Join-Path $codePath "node_modules"
   if (-Not (Test-Path $indexJsPath)) {
      echo "Missing $indexJsPath"
      Return
   }
   
   $zipFileExists = Test-Path $zipFile
   Compress-Archive -Path $indexJsPath -DestinationPath $zipFile -Update
   $nodeModulesExists = Test-Path $nodeModules
   if (($updateDeps -Or (-Not $zipFileExists)) -And (Test-Path $nodeModules)) {
      Compress-Archive -Path $nodeModules -DestinationPath $zipFile -Update
   }
   
   $s3key = "functions/" + $function + "/code.zip"
   $s3path = "s3://" + $s3bucket + "/" + $s3key
   aws s3 cp $zipFile $s3Path
   if (-Not ($?)) {
      echo "Error uploading to S3"
      Return
   }
   echo "$zipFile uploaded to $s3Path"

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