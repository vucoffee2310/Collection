using System;
using System.Runtime.InteropServices;
using System.Security;
using System.Security.Cryptography;
using System.Text;

namespace Bookworm.AppCode
{
	// Token: 0x02000047 RID: 71
	public class Encrypto
	{
		// Token: 0x0600056F RID: 1391 RVA: 0x0001DB9C File Offset: 0x0001BD9C
		public static string EncryptString(SecureString input)
		{
			return Convert.ToBase64String(ProtectedData.Protect(Encoding.Unicode.GetBytes(Encrypto.ToInsecureString(input)), Encrypto.entropy, DataProtectionScope.CurrentUser));
		}

		// Token: 0x06000570 RID: 1392 RVA: 0x0001DBC0 File Offset: 0x0001BDC0
		public static SecureString DecryptString(string encryptedData)
		{
			SecureString secureString;
			try
			{
				byte[] array = ProtectedData.Unprotect(Convert.FromBase64String(encryptedData), Encrypto.entropy, DataProtectionScope.CurrentUser);
				secureString = Encrypto.ToSecureString(Encoding.Unicode.GetString(array));
			}
			catch
			{
				secureString = new SecureString();
			}
			return secureString;
		}

		// Token: 0x06000571 RID: 1393 RVA: 0x0001DC0C File Offset: 0x0001BE0C
		public static SecureString ToSecureString(string input)
		{
			SecureString secureString = new SecureString();
			foreach (char c in input)
			{
				secureString.AppendChar(c);
			}
			secureString.MakeReadOnly();
			return secureString;
		}

		// Token: 0x06000572 RID: 1394 RVA: 0x0001DC48 File Offset: 0x0001BE48
		public static string ToInsecureString(SecureString input)
		{
			string text = string.Empty;
			IntPtr intPtr = Marshal.SecureStringToBSTR(input);
			try
			{
				text = Marshal.PtrToStringBSTR(intPtr);
			}
			finally
			{
				Marshal.ZeroFreeBSTR(intPtr);
			}
			return text;
		}

		// Token: 0x04000300 RID: 768
		private static byte[] entropy = Encoding.Unicode.GetBytes("Salt Is Not A Password");
	}
}
