function UpdateFunction($stack, $function)
{
   $stacksDescription = (aws cloudformation describe-stacks --stack-name $stack) | ConvertFrom-Json
   $outputKey = $function + "FunctionName"
   $functionOutput = $stacksDescription.Stacks[0].Outputs | Where {$_.OutputKey -eq $outputKey}
   $functionName = $functionOutput.OutputValue
   echo "Updating $functionName"
}