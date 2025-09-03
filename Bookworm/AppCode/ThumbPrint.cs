using System;
using System.Management;
using System.Security.Cryptography;
using System.Text;

namespace Bookworm.AppCode
{
	// Token: 0x0200004A RID: 74
	public class ThumbPrint
	{
		// Token: 0x06000582 RID: 1410 RVA: 0x0001E030 File Offset: 0x0001C230
		public static string Value()
		{
			if (string.IsNullOrEmpty(ThumbPrint.fingerPrint))
			{
				Console.WriteLine(string.Concat(new string[]
				{
					"CPU >> ",
					ThumbPrint.cpuId(),
					"\nBIOS >> ",
					ThumbPrint.biosId(),
					"\nBASE >> ",
					ThumbPrint.baseId(),
					"\nVIDEO >> ",
					ThumbPrint.videoId(),
					"\nMAC >> ",
					ThumbPrint.macId()
				}));
				ThumbPrint.fingerPrint = ThumbPrint.GetHash(string.Concat(new string[]
				{
					"CPU >> ",
					ThumbPrint.cpuId(),
					"\nBIOS >> ",
					ThumbPrint.biosId(),
					"\nBASE >> ",
					ThumbPrint.baseId()
				}));
			}
			return ThumbPrint.fingerPrint;
		}

		// Token: 0x06000583 RID: 1411 RVA: 0x0001E0F8 File Offset: 0x0001C2F8
		public static string realValue()
		{
			return string.Concat(new string[]
			{
				"CPU >> ",
				ThumbPrint.cpuId(),
				"\nBIOS >> ",
				ThumbPrint.biosId(),
				"\nBASE >> ",
				ThumbPrint.baseId(),
				ThumbPrint.videoId(),
				"\nMAC >> ",
				ThumbPrint.macId()
			});
		}

		// Token: 0x06000584 RID: 1412 RVA: 0x0001E15C File Offset: 0x0001C35C
		private static string GetHash(string s)
		{
			HashAlgorithm hashAlgorithm = new MD5CryptoServiceProvider();
			byte[] bytes = new ASCIIEncoding().GetBytes(s);
			return ThumbPrint.GetHexString(hashAlgorithm.ComputeHash(bytes));
		}

		// Token: 0x06000585 RID: 1413 RVA: 0x0001E188 File Offset: 0x0001C388
		private static string GetHexString(byte[] bt)
		{
			string text = string.Empty;
			for (int i = 0; i < bt.Length; i++)
			{
				byte b = bt[i];
				int num = (int)(b & 15);
				int num2 = (b >> 4) & 15;
				if (num2 > 9)
				{
					text += ((char)(num2 - 10 + 65)).ToString();
				}
				else
				{
					text += num2.ToString();
				}
				if (num > 9)
				{
					text += ((char)(num - 10 + 65)).ToString();
				}
				else
				{
					text += num.ToString();
				}
				if (i + 1 != bt.Length && (i + 1) % 2 == 0)
				{
					text += "-";
				}
			}
			return text;
		}

		// Token: 0x06000586 RID: 1414 RVA: 0x0001E234 File Offset: 0x0001C434
		private static string identifier(string wmiClass, string wmiProperty, string wmiMustBeTrue)
		{
			string text = "";
			foreach (ManagementBaseObject managementBaseObject in new ManagementClass(wmiClass).GetInstances())
			{
				ManagementObject managementObject = (ManagementObject)managementBaseObject;
				if (managementObject[wmiMustBeTrue].ToString() == "True" && text == "")
				{
					try
					{
						text = managementObject[wmiProperty].ToString();
						break;
					}
					catch
					{
					}
				}
			}
			return text;
		}

		// Token: 0x06000587 RID: 1415 RVA: 0x0001E2D0 File Offset: 0x0001C4D0
		private static string identifier(string wmiClass, string wmiProperty)
		{
			string text = "";
			foreach (ManagementBaseObject managementBaseObject in new ManagementClass(wmiClass).GetInstances())
			{
				ManagementObject managementObject = (ManagementObject)managementBaseObject;
				if (text == "")
				{
					try
					{
						text = managementObject[wmiProperty].ToString();
						break;
					}
					catch
					{
					}
				}
			}
			return text;
		}

		// Token: 0x06000588 RID: 1416 RVA: 0x0001E354 File Offset: 0x0001C554
		private static string cpuId()
		{
			string text = ThumbPrint.identifier("Win32_Processor", "UniqueId");
			if (text == "")
			{
				text = ThumbPrint.identifier("Win32_Processor", "ProcessorId");
				if (text == "")
				{
					text = ThumbPrint.identifier("Win32_Processor", "Name");
					if (text == "")
					{
						text = ThumbPrint.identifier("Win32_Processor", "Manufacturer");
					}
					text += ThumbPrint.identifier("Win32_Processor", "MaxClockSpeed");
				}
			}
			return text;
		}

		// Token: 0x06000589 RID: 1417 RVA: 0x0001E3E0 File Offset: 0x0001C5E0
		private static string biosId()
		{
			return string.Concat(new string[]
			{
				ThumbPrint.identifier("Win32_BIOS", "Manufacturer"),
				ThumbPrint.identifier("Win32_BIOS", "SMBIOSBIOSVersion"),
				ThumbPrint.identifier("Win32_BIOS", "IdentificationCode"),
				ThumbPrint.identifier("Win32_BIOS", "SerialNumber"),
				ThumbPrint.identifier("Win32_BIOS", "ReleaseDate"),
				ThumbPrint.identifier("Win32_BIOS", "Version")
			});
		}

		// Token: 0x0600058A RID: 1418 RVA: 0x0001E464 File Offset: 0x0001C664
		private static string diskId()
		{
			return ThumbPrint.identifier("Win32_DiskDrive", "Model") + ThumbPrint.identifier("Win32_DiskDrive", "Manufacturer") + ThumbPrint.identifier("Win32_DiskDrive", "Signature") + ThumbPrint.identifier("Win32_DiskDrive", "TotalHeads");
		}

		// Token: 0x0600058B RID: 1419 RVA: 0x0001E4B4 File Offset: 0x0001C6B4
		private static string baseId()
		{
			return ThumbPrint.identifier("Win32_BaseBoard", "Model") + ThumbPrint.identifier("Win32_BaseBoard", "Manufacturer") + ThumbPrint.identifier("Win32_BaseBoard", "Name") + ThumbPrint.identifier("Win32_BaseBoard", "SerialNumber");
		}

		// Token: 0x0600058C RID: 1420 RVA: 0x0001E502 File Offset: 0x0001C702
		private static string videoId()
		{
			return ThumbPrint.identifier("Win32_VideoController", "DriverVersion") + ThumbPrint.identifier("Win32_VideoController", "Name");
		}

		// Token: 0x0600058D RID: 1421 RVA: 0x0001E527 File Offset: 0x0001C727
		private static string macId()
		{
			return ThumbPrint.identifier("Win32_NetworkAdapterConfiguration", "MACAddress", "IPEnabled");
		}

		// Token: 0x04000307 RID: 775
		private static string fingerPrint = string.Empty;
	}
}
