Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get the folder where this VBS file lives
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Set working directory to that folder
WshShell.CurrentDirectory = scriptDir

' Check if node_modules exists
nodeModulesPath = scriptDir & "\node_modules"

If Not fso.FolderExists(nodeModulesPath) Then
    ' First time setup — show a window so user can see progress
    WshShell.Run "cmd /k ""echo Installing PyPath dependencies, please wait... && npm install && echo Done! Starting PyPath... && npm start && exit""", 1, True
Else
    ' Already installed — launch silently
    WshShell.Run "cmd /c npm start", 0, False
End If

Set WshShell = Nothing
Set fso = Nothing