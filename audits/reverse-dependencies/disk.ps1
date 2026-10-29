# Read-only NTFS data-stream allocation, not an estimate from rounded file sizes.
Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;
public static class ReverseDiskMeasure {
  [StructLayout(LayoutKind.Sequential)] struct StandardInfo {
    public long AllocationSize; public long EndOfFile; public uint Links;
    public byte DeletePending; public byte Directory;
  }
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
  static extern SafeFileHandle CreateFile(string path,uint access,uint share,IntPtr security,uint disposition,uint flags,IntPtr template);
  [DllImport("kernel32.dll", SetLastError=true)]
  static extern bool GetFileInformationByHandleEx(SafeFileHandle file,int kind,out StandardInfo info,uint size);
  public static long[] Measure(string directory) {
    long files=0,logical=0,allocated=0,reverseFiles=0,reverseLogical=0,reverseAllocated=0;
    foreach(string path in System.IO.Directory.EnumerateFiles(directory,"*",SearchOption.AllDirectories)) {
      using(var file=CreateFile(path,0,7,IntPtr.Zero,3,128,IntPtr.Zero)) {
        StandardInfo info;
        if(file.IsInvalid || !GetFileInformationByHandleEx(file,1,out info,(uint)Marshal.SizeOf(typeof(StandardInfo))))
          throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(),path);
        files++; logical+=info.EndOfFile; allocated+=info.AllocationSize;
        if(Path.GetFileName(path)=="reverse-dependencies.html") {reverseFiles++;reverseLogical+=info.EndOfFile;reverseAllocated+=info.AllocationSize;}
      }
    }
    return new long[]{files,logical,allocated,reverseFiles,reverseLogical,reverseAllocated};
  }
}
'@
function Measure-ReverseDisk([string]$path) {
    $values=[ReverseDiskMeasure]::Measure([System.IO.Path]::GetFullPath($path))
    return @{files=$values[0];logicalBytes=$values[1];allocatedBytes=$values[2];reverseFiles=$values[3];reverseLogicalBytes=$values[4];reverseAllocatedBytes=$values[5];method='GetFileInformationByHandleEx / FILE_STANDARD_INFO.AllocationSize; excludes directory/MFT overhead'}
}
