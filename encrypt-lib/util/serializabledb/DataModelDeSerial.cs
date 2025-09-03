using System;
using System.Runtime.CompilerServices;
using com.edc.classbook.model;
using IKVM.Attributes;
using IKVM.Runtime;
using java.io;
using java.lang;
using java.util;

namespace com.edc.classbook.util.serializabledb
{
	// Token: 0x02000067 RID: 103
	public class DataModelDeSerial : Object
	{
		// Token: 0x0600038B RID: 907 RVA: 0x00013378 File Offset: 0x00011578
		[Throws(new string[] { "java.lang.Exception" })]
		[LineNumberTable(new byte[] { 159, 176, 232, 48, 103, 231, 80, 103, 107 })]
		[MethodImpl(8)]
		public DataModelDeSerial(InputStream input)
		{
			this.inputStream = null;
			this.objInputStream = null;
			this.inputStream = input;
			this.pageSeq = new Hashtable();
		}

		// Token: 0x0600038C RID: 908 RVA: 0x000133B0 File Offset: 0x000115B0
		[Throws(new string[] { "java.lang.Exception" })]
		[Signature("()Ljava/util/Hashtable<Ljava/lang/String;Ljava/util/ArrayList<Lcom/edc/classbook/model/DataModel;>;>;")]
		[LineNumberTable(new byte[]
		{
			95, 166, 118, 255, 4, 72, 139, 101, 220, 2,
			97, 102, 230, 57, 139, 101, 222, 5, 98, 135,
			233, 51, 98, 203, 139, 101, 222, 2, 97, 102,
			227, 57, 139, 101, 222, 2, 98, 135, 98
		})]
		[MethodImpl(8)]
		public virtual Hashtable getAllDataModel()
		{
			Hashtable hashtable = new Hashtable();
			Exception ex3;
			try
			{
				try
				{
					ObjectInputStream.__<clinit>();
					this.objInputStream = new ObjectInputStream(this.inputStream);
					hashtable = (Hashtable)this.objInputStream.readObject();
				}
				catch (Exception ex)
				{
					Exception ex2 = ByteCodeHelper.MapException<Exception>(ex, ByteCodeHelper.MapFlags.None);
					if (ex2 == null)
					{
						throw;
					}
					ex3 = ex2;
					goto IL_0077;
				}
			}
			catch
			{
				Exception ex6;
				try
				{
					this.objInputStream.close();
					java.lang.System.runFinalization();
					java.lang.System.gc();
				}
				catch (Exception ex4)
				{
					Exception ex5 = ByteCodeHelper.MapException<Exception>(ex4, ByteCodeHelper.MapFlags.None);
					if (ex5 == null)
					{
						throw;
					}
					ex6 = ex5;
					goto IL_0068;
				}
				goto IL_0074;
				IL_0068:
				Exception ex7 = ex6;
				Throwable.instancehelper_printStackTrace(ex7);
				IL_0074:
				throw;
			}
			Exception ex10;
			try
			{
				this.objInputStream.close();
				java.lang.System.runFinalization();
				java.lang.System.gc();
			}
			catch (Exception ex8)
			{
				Exception ex9 = ByteCodeHelper.MapException<Exception>(ex8, ByteCodeHelper.MapFlags.None);
				if (ex9 == null)
				{
					throw;
				}
				ex10 = ex9;
				goto IL_00A4;
			}
			return hashtable;
			IL_00A4:
			Exception ex11 = ex10;
			Throwable.instancehelper_printStackTrace(ex11);
			return hashtable;
			IL_0077:
			Exception ex12 = ex3;
			try
			{
				ex11 = ex12;
				Throwable.instancehelper_printStackTrace(ex11);
			}
			catch
			{
				try
				{
					this.objInputStream.close();
					java.lang.System.runFinalization();
					java.lang.System.gc();
				}
				catch (Exception ex13)
				{
					Exception ex14 = ByteCodeHelper.MapException<Exception>(ex13, ByteCodeHelper.MapFlags.None);
					if (ex14 == null)
					{
						throw;
					}
					ex12 = ex14;
					goto IL_00F6;
				}
				goto IL_0103;
				IL_00F6:
				Exception ex7 = ex12;
				Throwable.instancehelper_printStackTrace(ex7);
				IL_0103:
				throw;
			}
			Exception ex17;
			try
			{
				this.objInputStream.close();
				java.lang.System.runFinalization();
				java.lang.System.gc();
			}
			catch (Exception ex15)
			{
				Exception ex16 = ByteCodeHelper.MapException<Exception>(ex15, ByteCodeHelper.MapFlags.None);
				if (ex16 == null)
				{
					throw;
				}
				ex17 = ex16;
				goto IL_0130;
			}
			return hashtable;
			IL_0130:
			ex11 = ex17;
			Throwable.instancehelper_printStackTrace(ex11);
			return hashtable;
		}

		// Token: 0x0600038D RID: 909 RVA: 0x00013558 File Offset: 0x00011758
		[Throws(new string[] { "java.lang.Exception" })]
		[LineNumberTable(new byte[] { 159, 170, 232, 54, 103, 231, 74, 103, 107 })]
		[MethodImpl(8)]
		public DataModelDeSerial(string serialFile)
		{
			this.inputStream = null;
			this.objInputStream = null;
			this.serialFile = serialFile;
			this.pageSeq = new Hashtable();
		}

		// Token: 0x0600038E RID: 910 RVA: 0x00013590 File Offset: 0x00011790
		[LineNumberTable(new byte[] { 159, 181, 232, 43, 103, 231, 86 })]
		[MethodImpl(8)]
		public DataModelDeSerial()
		{
			this.inputStream = null;
			this.objInputStream = null;
		}

		// Token: 0x0600038F RID: 911 RVA: 0x000135B3 File Offset: 0x000117B3
		public virtual void setSerialFile(string serialFile)
		{
			this.serialFile = serialFile;
		}

		// Token: 0x06000390 RID: 912 RVA: 0x000135BC File Offset: 0x000117BC
		public virtual string getSerialFile()
		{
			return this.serialFile;
		}

		// Token: 0x06000391 RID: 913 RVA: 0x000135C4 File Offset: 0x000117C4
		[LineNumberTable(new byte[]
		{
			160, 104, 144, 103, 144, 255, 160, 69, 71, 2,
			97, 134
		})]
		[MethodImpl(8)]
		public static void main(string[] args)
		{
			Exception ex3;
			try
			{
				DataModelDeSerial dataModelDeSerial = new DataModelDeSerial(new FileInputStream("E:\\encrypt-lib_getall\\bookdata/additional.clsb"));
				Hashtable allDataModel = dataModelDeSerial.getAllDataModel();
				java.lang.System.@out.println(allDataModel.size());
				java.lang.System.@out.println(new StringBuilder().append(((DataModel)((ArrayList)allDataModel.get("6")).get(1)).getData_index()).append(" ").append(((DataModel)((ArrayList)allDataModel.get("6")).get(1)).getTitle())
					.append(((DataModel)((ArrayList)allDataModel.get("6")).get(1)).getSourceData())
					.toString());
			}
			catch (Exception ex)
			{
				Exception ex2 = ByteCodeHelper.MapException<Exception>(ex, ByteCodeHelper.MapFlags.None);
				if (ex2 == null)
				{
					throw;
				}
				ex3 = ex2;
				goto IL_00C8;
			}
			return;
			IL_00C8:
			Exception ex4 = ex3;
			Throwable.instancehelper_printStackTrace(ex4);
		}

		// Token: 0x06000392 RID: 914 RVA: 0x000136B8 File Offset: 0x000118B8
		public virtual void setInputStream(InputStream inputStream)
		{
			this.inputStream = inputStream;
		}

		// Token: 0x06000393 RID: 915 RVA: 0x000136C1 File Offset: 0x000118C1
		public virtual InputStream getInputStream()
		{
			return this.inputStream;
		}

		// Token: 0x0400015C RID: 348
		private string serialFile;

		// Token: 0x0400015D RID: 349
		private InputStream inputStream;

		// Token: 0x0400015E RID: 350
		private ObjectInputStream objInputStream;

		// Token: 0x0400015F RID: 351
		[Signature("Ljava/util/Hashtable<Ljava/lang/String;Ljava/lang/String;>;")]
		private Hashtable pageSeq;
	}
}
