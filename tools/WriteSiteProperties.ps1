function WriteSiteProperties(
    [Parameter(Mandatory=$True)][string]$stack,
    [string] $wwwPath
)
{
   if (-Not $wwwPath) {
        $wwwPath = "www"
   }
   $propsFile = Join-Path $wwwPath "properties.json"
   echo "Will write $propsFile"

   $stacksDescription = (aws cloudformation describe-stacks --stack-name $stack) | ConvertFrom-Json
   if (-Not ($stacksDescription)) {
      echo "Could not describe stack $stack"
      Return
   }
   $endpointOutput = $stacksDescription.Stacks[0].Outputs | Where {$_.OutputKey -eq 'FcplApiEndpoint'}
   if (-Not ($endpointOutput)) {
      echo "Could not find an FcplApiEndpoint output in stack $stack"
      Return
   }
   $endpoint = $endpointOutput.OutputValue
   echo "Endpoint: $endpoint"
   
   $props = @{endpoint = $endpoint}
   ConvertTo-Json $props > $propsFile   
}