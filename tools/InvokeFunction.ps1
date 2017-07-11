function InvokeFunction(
    [Parameter(Mandatory=$True)][string]$functionName,
    [Object]$payload = @{}
)
{
    $tempFile = [System.IO.Path]::GetTempFileName()
    $payloadJson = (ConvertTo-Json $payload -Compress) -replace '"', '\"'
    echo "Payload: $payloadJson"
    $invokeResult = aws lambda invoke --function-name $functionName --invocation-type RequestResponse --payload $payloadJson --log-type Tail $tempFile | ConvertFrom-Json
    echo "Status: $invokeResult.StatusCode"
    $buf = [System.Convert]::FromBase64String($invokeResult.LogResult)
    echo "Log tail:"
    [System.Text.Encoding]::UTF8.GetString($buf)
    echo "Output:"
    cat $tempFile
    Remove-Item $tempFile
}