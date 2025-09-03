using System;
using System.Diagnostics;
using System.IO;
using System.Management;
using System.Security.AccessControl;
using System.Security.Cryptography;
using System.Text;
using System.Threading;

namespace Bookworm.AppCode
{
	// Token: 0x02000045 RID: 69
	internal class AppUtils
	{
		// Token: 0x0600055B RID: 1371 RVA: 0x0001D3F8 File Offset: 0x0001B5F8
		public static string getCSProductUUID()
		{
			ManagementScope managementScope = new ManagementScope("\\\\.\\ROOT\\cimv2");
			ObjectQuery objectQuery = new ObjectQuery("SELECT * FROM Win32_ComputerSystemProduct");
			ManagementObjectCollection managementObjectCollection = new ManagementObjectSearcher(managementScope, objectQuery).Get();
			string text = "";
			foreach (ManagementBaseObject managementBaseObject in managementObjectCollection)
			{
				text = ((ManagementObject)managementBaseObject)["UUID"].ToString();
				if (text != null && text.Trim().Length > 0)
				{
					break;
				}
			}
			return text;
		}

		// Token: 0x0600055C RID: 1372 RVA: 0x0001D488 File Offset: 0x0001B688
		private static string getDiskDriveSerial()
		{
			ManagementScope managementScope = new ManagementScope("\\\\.\\ROOT\\cimv2");
			ObjectQuery objectQuery = new ObjectQuery("SELECT * FROM Win32_DiskDrive");
			ManagementObjectCollection managementObjectCollection = new ManagementObjectSearcher(managementScope, objectQuery).Get();
			string text = "";
			foreach (ManagementBaseObject managementBaseObject in managementObjectCollection)
			{
				text = ((ManagementObject)managementBaseObject)["serialnumber"].ToString();
				if (text != null && text.Trim().Length > 0)
				{
					break;
				}
			}
			return text;
		}

		// Token: 0x0600055D RID: 1373 RVA: 0x0001D518 File Offset: 0x0001B718
		public static byte[] md5EncryptData(string data)
		{
			HashAlgorithm hashAlgorithm = new MD5CryptoServiceProvider();
			UTF8Encoding utf8Encoding = new UTF8Encoding();
			return hashAlgorithm.ComputeHash(utf8Encoding.GetBytes(data));
		}

		// Token: 0x0600055E RID: 1374 RVA: 0x0001D53C File Offset: 0x0001B73C
		public static string md5(string data)
		{
			return BitConverter.ToString(AppUtils.md5EncryptData(data)).Replace("-", "").ToLower();
		}

		// Token: 0x0600055F RID: 1375 RVA: 0x0001D560 File Offset: 0x0001B760
		public static string cal_window_id_full()
		{
			string text3;
			try
			{
				string text = AppUtils.getCSProductUUID();
				string text2;
				if (text != null && text.Trim().Length > 0)
				{
					text2 = AppUtils.md5(text.Replace("-", "") + "WINDOWID");
				}
				else
				{
					text = AppUtils.getDiskDriveSerial();
					if (text != null && text.Trim().Length > 0)
					{
						text2 = AppUtils.md5(text.Replace("-", "") + "WINDOWID");
					}
					else
					{
						text2 = null;
					}
				}
				text3 = text2;
			}
			catch (Exception)
			{
				text3 = null;
			}
			return text3;
		}

		// Token: 0x06000560 RID: 1376 RVA: 0x0001D600 File Offset: 0x0001B800
		public static string cal_window_id()
		{
			string text = AppUtils.cal_window_id_full();
			if (text != null)
			{
				text = text.Substring(0, 16);
			}
			return text;
		}

		// Token: 0x06000561 RID: 1377 RVA: 0x0001D621 File Offset: 0x0001B821
		public static string cal_serial()
		{
			return AppUtils.md5(AppUtils.cal_window_id() + "SERIAL").Substring(0, 16);
		}

		// Token: 0x06000562 RID: 1378 RVA: 0x0001D640 File Offset: 0x0001B840
		public static string getUniqueKey3()
		{
			string text = AppUtils.cal_window_id();
			string text2 = AppUtils.cal_serial();
			string text3 = ThumbPrint.realValue().Replace("-", "").Substring(0, 16);
			if (text == null || text2 == null)
			{
				return null;
			}
			string text4 = AppUtils.md5(string.Concat(new string[] { text, "#", text2, "#", text3 }));
			string text5 = "CA" + text4.Substring(text4.Length - 10);
			string text6 = AppUtils.md5(text5);
			string text7 = text6.Substring(text6.Length - 4);
			return text5 + text7;
		}

		// Token: 0x06000563 RID: 1379 RVA: 0x0001D6E0 File Offset: 0x0001B8E0
		public static string getUniqueKey()
		{
			string text = AppUtils.cal_window_id();
			string text2 = AppUtils.cal_serial();
			string text3 = text2;
			if (text == null || text2 == null)
			{
				return null;
			}
			string text4 = string.Concat(new string[] { text, "#", text2, "#", text3 });
			Console.WriteLine("AppUtils " + text4);
			string text5 = AppUtils.md5(text4);
			string text6 = "CA" + text5.Substring(text5.Length - 10);
			string text7 = AppUtils.md5(text6);
			string text8 = text7.Substring(text7.Length - 4);
			return text6 + text8;
		}

		// Token: 0x06000564 RID: 1380 RVA: 0x0001D77C File Offset: 0x0001B97C
		public static string DropVietnameseSign(string chucodau)
		{
			char[] array = "áàảãạâấầẩẫậăắằẳẵặđéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵÁÀẢÃẠÂẤẦẨẪẬĂẮẰẲẴẶĐÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴ".ToCharArray();
			int num;
			while ((num = chucodau.IndexOfAny(array)) != -1)
			{
				int num2 = "áàảãạâấầẩẫậăắằẳẵặđéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵÁÀẢÃẠÂẤẦẨẪẬĂẮẰẲẴẶĐÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴ".IndexOf(chucodau[num]);
				chucodau = chucodau.Replace(chucodau[num], "aaaaaaaaaaaaaaaaadeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyAAAAAAAAAAAAAAAAADEEEEEEEEEEEIIIIIOOOOOOOOOOOOOOOOOUUUUUUUUUUUYYYYY"[num2]);
			}
			return chucodau;
		}

		// Token: 0x06000565 RID: 1381 RVA: 0x0001D7D4 File Offset: 0x0001B9D4
		public static string nomarlizedText(string text)
		{
			string text2 = "";
			if (string.IsNullOrEmpty(text))
			{
				return text;
			}
			char[] array = " ".ToCharArray();
			string[] array2 = text.Trim().Split(array);
			if (array2.Length != 0)
			{
				text2 = array2[0];
			}
			for (int i = 1; i < array2.Length; i++)
			{
				if (!string.IsNullOrEmpty(array2[i].Trim()))
				{
					text2 = text2 + " " + array2[i].Trim();
				}
			}
			return text2;
		}

		// Token: 0x06000566 RID: 1382 RVA: 0x0001D844 File Offset: 0x0001BA44
		public static long CurrentTiemInMiliseconds()
		{
			return (long)(DateTime.UtcNow - AppUtils.Jan1St1970).TotalMilliseconds;
		}

		// Token: 0x06000567 RID: 1383 RVA: 0x0001D86C File Offset: 0x0001BA6C
		public static void setHiddenFolder(string folder, bool hide)
		{
			DirectoryInfo directoryInfo = new DirectoryInfo(folder);
			if (directoryInfo.Exists)
			{
				FileAttributes fileAttributes = directoryInfo.Attributes;
				if (hide)
				{
					if ((fileAttributes & FileAttributes.Hidden) != FileAttributes.Hidden)
					{
						fileAttributes |= FileAttributes.Hidden;
					}
				}
				else if ((fileAttributes & FileAttributes.Hidden) == FileAttributes.Hidden)
				{
					fileAttributes &= ~FileAttributes.Hidden;
				}
				directoryInfo.Attributes = fileAttributes;
			}
		}

		// Token: 0x06000568 RID: 1384 RVA: 0x0001D8B0 File Offset: 0x0001BAB0
		public static void setHiddenFile(string file, bool hide)
		{
			FileInfo fileInfo = new FileInfo(file);
			if (fileInfo.Exists)
			{
				FileAttributes fileAttributes = fileInfo.Attributes;
				if (hide)
				{
					if ((fileAttributes & FileAttributes.Hidden) != FileAttributes.Hidden)
					{
						fileAttributes |= FileAttributes.Hidden;
					}
				}
				else if ((fileAttributes & FileAttributes.Hidden) == FileAttributes.Hidden)
				{
					fileAttributes &= ~FileAttributes.Hidden;
				}
				fileInfo.Attributes = fileAttributes;
			}
		}

		// Token: 0x06000569 RID: 1385 RVA: 0x0001D8F4 File Offset: 0x0001BAF4
		public static void setFullPermision(string folder, string identity)
		{
			try
			{
				FileSystemAccessRule fileSystemAccessRule = new FileSystemAccessRule(identity, FileSystemRights.FullControl, InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit, PropagationFlags.None, AccessControlType.Allow);
				DirectoryInfo directoryInfo = new DirectoryInfo(folder);
				DirectorySecurity accessControl = directoryInfo.GetAccessControl();
				accessControl.AddAccessRule(fileSystemAccessRule);
				directoryInfo.SetAccessControl(accessControl);
			}
			catch (Exception ex)
			{
				Console.WriteLine(ex.Message);
			}
		}

		// Token: 0x0600056A RID: 1386 RVA: 0x0001D948 File Offset: 0x0001BB48
		public static void runProcess(string filename, string args)
		{
			using (Process process = new Process())
			{
				process.StartInfo.FileName = filename;
				process.StartInfo.Arguments = args;
				process.StartInfo.UseShellExecute = false;
				process.StartInfo.RedirectStandardOutput = true;
				process.StartInfo.RedirectStandardError = true;
				StringBuilder output = new StringBuilder();
				StringBuilder error = new StringBuilder();
				using (AutoResetEvent outputWaitHandle = new AutoResetEvent(false))
				{
					using (AutoResetEvent errorWaitHandle = new AutoResetEvent(false))
					{
						process.OutputDataReceived += delegate(object sender, DataReceivedEventArgs e)
						{
							if (e.Data == null)
							{
								outputWaitHandle.Set();
								return;
							}
							output.AppendLine(e.Data);
						};
						process.ErrorDataReceived += delegate(object sender, DataReceivedEventArgs e)
						{
							if (e.Data == null)
							{
								errorWaitHandle.Set();
								return;
							}
							error.AppendLine(e.Data);
						};
						process.Start();
						process.BeginOutputReadLine();
						process.BeginErrorReadLine();
						if (process.WaitForExit(30000) && outputWaitHandle.WaitOne(30000) && errorWaitHandle.WaitOne(30000))
						{
							process.Close();
						}
						else
						{
							process.Kill();
						}
					}
				}
			}
		}

		// Token: 0x0600056B RID: 1387 RVA: 0x0001DAD8 File Offset: 0x0001BCD8
		public static string FormatSizeBinary(long size, int decimals)
		{
			string[] array = new string[] { "B", "kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB" };
			double num = (double)size;
			int num2 = 0;
			while (num >= 1024.0 && num2 < array.Length)
			{
				num /= 1024.0;
				num2++;
			}
			return Math.Round(num, decimals).ToString() + array[num2];
		}

		// Token: 0x040002FF RID: 767
		private static readonly DateTime Jan1St1970 = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc);

		// Token: 0x02000090 RID: 144
		public static class IOUtils
		{
			// Token: 0x0600064C RID: 1612 RVA: 0x0002101C File Offset: 0x0001F21C
			public static bool DeleteDicrectory(string path)
			{
				bool flag;
				try
				{
					Directory.Delete(path, true);
					flag = true;
				}
				catch
				{
					flag = false;
				}
				return flag;
			}
		}
	}
}
