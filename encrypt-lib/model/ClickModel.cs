using System;
using System.Runtime.CompilerServices;
using System.Runtime.Serialization;
using System.Security;
using System.Security.Permissions;
using IKVM.Attributes;
using ikvm.@internal;
using IKVM.Runtime;
using java.io;
using java.lang;

namespace com.edc.classbook.model
{
	// Token: 0x02000004 RID: 4
	[Implements(new string[] { "java.io.Serializable" })]
	[Serializable]
	public class ClickModel : Object, Serializable.__Interface, ISerializable
	{
		// Token: 0x06000026 RID: 38 RVA: 0x000022A8 File Offset: 0x000004A8
		[LineNumberTable(new byte[] { 159, 171, 136 })]
		[MethodImpl(8)]
		public ClickModel()
		{
		}

		// Token: 0x06000027 RID: 39 RVA: 0x000022B4 File Offset: 0x000004B4
		[LineNumberTable(new byte[]
		{
			159, 179, 168, 223, 9, 226, 61, 97, 102, 231,
			69, 223, 4, 226, 61, 97, 102, 199, 223, 12,
			226, 61, 97, 102, 204, 223, 12, 226, 61, 97,
			102, 204, 223, 12, 226, 61, 97, 102, 204, 223,
			12, 226, 61, 97, 102, 172, 172, 223, 11, 226,
			61, 97, 102, 199, 255, 11, 69, 226, 60, 97,
			102, 199
		})]
		[MethodImpl(8)]
		public ClickModel(ClickModelEnc enc)
		{
			Exception ex3;
			try
			{
				this.clickable_type = Integer.parseInt(enc.getClickable_type());
			}
			catch (Exception ex)
			{
				Exception ex2 = ByteCodeHelper.MapException<Exception>(ex, ByteCodeHelper.MapFlags.None);
				if (ex2 == null)
				{
					throw;
				}
				ex3 = ex2;
				goto IL_002D;
			}
			goto IL_0040;
			IL_002D:
			Exception ex4 = ex3;
			Throwable.instancehelper_printStackTrace(ex4);
			this.clickable_type = 0;
			Exception ex7;
			try
			{
				IL_0040:
				this.page_index = enc.getPage_index();
			}
			catch (Exception ex5)
			{
				Exception ex6 = ByteCodeHelper.MapException<Exception>(ex5, ByteCodeHelper.MapFlags.None);
				if (ex6 == null)
				{
					throw;
				}
				ex7 = ex6;
				goto IL_0060;
			}
			goto IL_0073;
			IL_0060:
			ex4 = ex7;
			Throwable.instancehelper_printStackTrace(ex4);
			this.page_index = 0;
			Exception ex10;
			try
			{
				IL_0073:
				this.x = Double.parseDouble(enc.getX());
			}
			catch (Exception ex8)
			{
				Exception ex9 = ByteCodeHelper.MapException<Exception>(ex8, ByteCodeHelper.MapFlags.None);
				if (ex9 == null)
				{
					throw;
				}
				ex10 = ex9;
				goto IL_009A;
			}
			goto IL_00B3;
			IL_009A:
			ex4 = ex10;
			Throwable.instancehelper_printStackTrace(ex4);
			this.x = (double)0f;
			Exception ex13;
			try
			{
				IL_00B3:
				this.y = Double.parseDouble(enc.getY());
			}
			catch (Exception ex11)
			{
				Exception ex12 = ByteCodeHelper.MapException<Exception>(ex11, ByteCodeHelper.MapFlags.None);
				if (ex12 == null)
				{
					throw;
				}
				ex13 = ex12;
				goto IL_00DA;
			}
			goto IL_00F3;
			IL_00DA:
			ex4 = ex13;
			Throwable.instancehelper_printStackTrace(ex4);
			this.y = (double)0f;
			Exception ex16;
			try
			{
				IL_00F3:
				this.width = Double.parseDouble(enc.getWidth());
			}
			catch (Exception ex14)
			{
				Exception ex15 = ByteCodeHelper.MapException<Exception>(ex14, ByteCodeHelper.MapFlags.None);
				if (ex15 == null)
				{
					throw;
				}
				ex16 = ex15;
				goto IL_011A;
			}
			goto IL_0133;
			IL_011A:
			ex4 = ex16;
			Throwable.instancehelper_printStackTrace(ex4);
			this.y = (double)0f;
			Exception ex19;
			try
			{
				IL_0133:
				this.height = Double.parseDouble(enc.getHeight());
			}
			catch (Exception ex17)
			{
				Exception ex18 = ByteCodeHelper.MapException<Exception>(ex17, ByteCodeHelper.MapFlags.None);
				if (ex18 == null)
				{
					throw;
				}
				ex19 = ex18;
				goto IL_015A;
			}
			goto IL_0173;
			IL_015A:
			ex4 = ex19;
			Throwable.instancehelper_printStackTrace(ex4);
			this.y = (double)0f;
			IL_0173:
			this.file_path = enc.getFile_path();
			Exception ex22;
			try
			{
				this.Active = Integer.parseInt(enc.getActive());
			}
			catch (Exception ex20)
			{
				Exception ex21 = ByteCodeHelper.MapException<Exception>(ex20, ByteCodeHelper.MapFlags.None);
				if (ex21 == null)
				{
					throw;
				}
				ex22 = ex21;
				goto IL_01A5;
			}
			goto IL_01B9;
			IL_01A5:
			ex4 = ex22;
			Throwable.instancehelper_printStackTrace(ex4);
			this.Active = 0;
			Exception ex25;
			try
			{
				IL_01B9:
				this.tts_type = Integer.parseInt(enc.getTts_type());
			}
			catch (Exception ex23)
			{
				Exception ex24 = ByteCodeHelper.MapException<Exception>(ex23, ByteCodeHelper.MapFlags.None);
				if (ex24 == null)
				{
					throw;
				}
				ex25 = ex24;
				goto IL_01DF;
			}
			return;
			IL_01DF:
			ex4 = ex25;
			Throwable.instancehelper_printStackTrace(ex4);
			this.tts_type = 0;
		}

		// Token: 0x06000028 RID: 40 RVA: 0x00002518 File Offset: 0x00000718
		[LineNumberTable(new byte[]
		{
			64, 104, 103, 103, 103, 106, 106, 106, 106, 104,
			104, 104
		})]
		[MethodImpl(8)]
		public ClickModel(int _id, int _clickable_type, int _page_index, double _x, double _y, double _width, double _height, string _file_path, int _active, int _tts_type)
		{
			this.id = _id;
			this.clickable_type = _clickable_type;
			this.page_index = _page_index;
			this.x = _x;
			this.y = _y;
			this.width = _width;
			this.height = _height;
			this.file_path = _file_path;
			this.Active = _active;
			this.tts_type = _tts_type;
		}

		// Token: 0x06000029 RID: 41 RVA: 0x00002582 File Offset: 0x00000782
		public virtual int getId()
		{
			return this.id;
		}

		// Token: 0x0600002A RID: 42 RVA: 0x0000258A File Offset: 0x0000078A
		public virtual void setId(int id)
		{
			this.id = id;
		}

		// Token: 0x0600002B RID: 43 RVA: 0x00002593 File Offset: 0x00000793
		public virtual int getClickable_type()
		{
			return this.clickable_type;
		}

		// Token: 0x0600002C RID: 44 RVA: 0x0000259B File Offset: 0x0000079B
		public virtual void setClickable_type(int clickable_type)
		{
			this.clickable_type = clickable_type;
		}

		// Token: 0x0600002D RID: 45 RVA: 0x000025A4 File Offset: 0x000007A4
		public virtual int getPage_index()
		{
			return this.page_index;
		}

		// Token: 0x0600002E RID: 46 RVA: 0x000025AC File Offset: 0x000007AC
		public virtual void setPage_index(int page_index)
		{
			this.page_index = page_index;
		}

		// Token: 0x0600002F RID: 47 RVA: 0x000025B5 File Offset: 0x000007B5
		public virtual double getX()
		{
			return this.x;
		}

		// Token: 0x06000030 RID: 48 RVA: 0x000025BD File Offset: 0x000007BD
		public virtual void setX(double x)
		{
			this.x = x;
		}

		// Token: 0x06000031 RID: 49 RVA: 0x000025C8 File Offset: 0x000007C8
		public virtual double getY()
		{
			return this.y;
		}

		// Token: 0x06000032 RID: 50 RVA: 0x000025D0 File Offset: 0x000007D0
		public virtual void setY(double y)
		{
			this.y = y;
		}

		// Token: 0x06000033 RID: 51 RVA: 0x000025DB File Offset: 0x000007DB
		public virtual double getWidth()
		{
			return this.width;
		}

		// Token: 0x06000034 RID: 52 RVA: 0x000025E3 File Offset: 0x000007E3
		public virtual void setWidth(double width)
		{
			this.width = width;
		}

		// Token: 0x06000035 RID: 53 RVA: 0x000025EE File Offset: 0x000007EE
		public virtual double getHeight()
		{
			return this.height;
		}

		// Token: 0x06000036 RID: 54 RVA: 0x000025F6 File Offset: 0x000007F6
		public virtual void setHeight(double height)
		{
			this.height = height;
		}

		// Token: 0x06000037 RID: 55 RVA: 0x00002601 File Offset: 0x00000801
		public virtual string getFile_path()
		{
			return this.file_path;
		}

		// Token: 0x06000038 RID: 56 RVA: 0x00002609 File Offset: 0x00000809
		public virtual void setFile_path(string file_path)
		{
			this.file_path = file_path;
		}

		// Token: 0x06000039 RID: 57 RVA: 0x00002612 File Offset: 0x00000812
		public virtual int getActive()
		{
			return this.Active;
		}

		// Token: 0x0600003A RID: 58 RVA: 0x0000261A File Offset: 0x0000081A
		public virtual void setActive(int active)
		{
			this.Active = active;
		}

		// Token: 0x0600003B RID: 59 RVA: 0x00002623 File Offset: 0x00000823
		public virtual int getTts_type()
		{
			return this.tts_type;
		}

		// Token: 0x0600003C RID: 60 RVA: 0x0000262B File Offset: 0x0000082B
		public virtual void setTts_type(int tts_type)
		{
			this.tts_type = tts_type;
		}

		// Token: 0x0600003D RID: 61 RVA: 0x00002634 File Offset: 0x00000834
		[HideFromJava]
		public static implicit operator Serializable(ClickModel A_0)
		{
			Serializable serializable;
			serializable.__<ref> = A_0;
			return serializable;
		}

		// Token: 0x0600003E RID: 62 RVA: 0x00002650 File Offset: 0x00000850
		[SecurityCritical]
		[HideFromJava]
		[PermissionSet(2, XML = "<PermissionSet class=\"System.Security.PermissionSet\"\r\nversion=\"1\">\r\n<IPermission class=\"System.Security.Permissions.SecurityPermission, mscorlib, Version=2.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089\"\r\nversion=\"1\"\r\nFlags=\"SerializationFormatter\"/>\r\n</PermissionSet>\r\n")]
		protected virtual void GetObjectData(SerializationInfo A_1, StreamingContext A_2)
		{
			Serialization.writeObject(this, A_1);
		}

		// Token: 0x0600003F RID: 63 RVA: 0x00002659 File Offset: 0x00000859
		[HideFromJava]
		[PermissionSet(2, XML = "<PermissionSet class=\"System.Security.PermissionSet\"\r\nversion=\"1\">\r\n<IPermission class=\"System.Security.Permissions.SecurityPermission, mscorlib, Version=2.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089\"\r\nversion=\"1\"\r\nFlags=\"SerializationFormatter\"/>\r\n</PermissionSet>\r\n")]
		protected ClickModel(SerializationInfo A_1, StreamingContext A_2)
		{
			Serialization.readObject(this, A_1);
		}

		// Token: 0x0400000F RID: 15
		private int id;

		// Token: 0x04000010 RID: 16
		private int clickable_type;

		// Token: 0x04000011 RID: 17
		private int page_index;

		// Token: 0x04000012 RID: 18
		private double x;

		// Token: 0x04000013 RID: 19
		private double y;

		// Token: 0x04000014 RID: 20
		private double width;

		// Token: 0x04000015 RID: 21
		private double height;

		// Token: 0x04000016 RID: 22
		private string file_path;

		// Token: 0x04000017 RID: 23
		private int Active;

		// Token: 0x04000018 RID: 24
		private int tts_type;
	}
}
