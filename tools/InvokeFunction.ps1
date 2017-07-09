function InvokeFunction(
    [Parameter(Mandatory=$True)][string]$functionName
)
{
    $tempFile = [System.IO.Path]::GetTempFileName()
    $invokeResult = aws lambda invoke --function-name $functionName --invocation-type RequestResponse --log-type Tail $tempFile | ConvertFrom-Json
    echo "Status: $invokeResult.StatusCode"
    $buf = [System.Convert]::FromBase64String($invokeResult.LogResult)
    echo "Log tail:"
    [System.Text.Encoding]::UTF8.GetString($buf)
    echo "Output:"
    cat $tempFile
    Remove-Item $tempFile
}