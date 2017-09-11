function WriteSiteProperties(
    [Parameter(Mandatory=$True)][string]$stack,
    [string] $wwwPath
)
{
   if (-Not $wwwPath) {
        $wwwPath = Join-Path $(Get-Location) 'www'
   }
   $propsFile = Join-Path $wwwPath "properties.json"
   echo "Will write $propsFile"

   $stacksDescription = (aws cloudformation describe-stacks --stack-name $stack) | ConvertFrom-Json
   if (-Not ($stacksDescription)) {
      echo "Could not describe stack $stack"
      Return
   }
   
   $stackOutputMap = (
        @{OutputKey = 'FcplApiEndpoint'; PropsKey = 'FCPL_API_ENDPOINT'},
        @{OutputKey = 'UserPoolId'; PropsKey = 'USER_POOL_ID'},
        @{OutputKey = 'UserPoolClientId'; PropsKey = 'USER_POOL_CLIENT_ID'},
        @{OutputKey = 'IdentityPoolId'; PropsKey = 'IDENTITY_POOL_ID'},
        @{OutputKey = 'IdentityPoolAuthenticatedRoleArn'; PropsKey = 'COGNITO_AUTHENTICATED_ROLE_ARN'},
        @{OutputKey = 'Region'; PropsKey = 'AWS_REGION'}
   )
   
   $propsObj = @{}
   
   $stackOutputMap | ForEach-Object {
        $desiredKey = $_.OutputKey
        $propsKey = $_.PropsKey
        $outputObj = $stacksDescription.Stacks[0].Outputs | Where {$_.OutputKey -eq $desiredKey}
        if (-Not ($outputObj)) {
            echo "Could not find $desiredKey output in stack $stack"
            Return
        }
        $propsObj.$propsKey = "'" + $outputObj.OutputValue + "'"
   }
   
   $propsJson = ConvertTo-Json $propsObj
   echo $propsJson
   [System.IO.File]::WriteAllLines($propsFile, $propsJson)
}